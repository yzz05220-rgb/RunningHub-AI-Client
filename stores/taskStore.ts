import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BackgroundTask, NodeInfo, TaskOutput } from '../types';
import { submitTask, queryTaskOutputs, cancelTask as cancelTaskApi } from '../services/api';

// RunningHub API 状态码
const API_CODE = {
    SUCCESS: 0,
    RUNNING: 804,
    FAILED: 805,
    QUEUED: 813,
    QUEUE_MAXED: 806,
};

// 并发限制
const MAX_CONCURRENT = 3;

// 存储键
const STORAGE_KEY = 'rh_task_history';

interface TaskState {
    tasks: BackgroundTask[];
    runningCount: number;

    // Actions
    addTask: (appId: string, appName: string, apiKey: string, webappId: string, params: NodeInfo[]) => void;
    addBatchTasks: (appId: string, appName: string, apiKey: string, webappId: string, paramsList: NodeInfo[][]) => void;
    removeTask: (taskId: string) => void;
    cancelTask: (taskId: string) => void;
    removeTaskResult: (taskId: string, resultIndex: number) => void;
    clearHistory: () => void;

    // Internal
    updateTask: (taskId: string, updates: Partial<BackgroundTask>) => void;
    processNextInQueue: () => void;
    startTask: (task: BackgroundTask) => void;
}

// 定时器存储，用于清理
const taskTimers: Map<string, { pollInterval?: ReturnType<typeof setInterval>; timeout?: ReturnType<typeof setTimeout> }> = new Map();

export const useTaskStore = create<TaskState>()(
    persist(
        (set, get) => ({
            tasks: [],
            runningCount: 0,

            updateTask: (taskId, updates) => {
                set((state) => ({
                    tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
                }));
            },

            // 处理队列中的下一个任务
            processNextInQueue: () => {
                const { tasks, runningCount } = get();

                // 找到第一个 QUEUED 状态的任务
                const queuedTask = tasks.find(t => t.status === 'QUEUED');

                if (runningCount < MAX_CONCURRENT && queuedTask) {
                    console.log(`[Queue] Starting queued task: ${queuedTask.id}`);
                    get().startTask(queuedTask);
                }
            },

            // 内部方法：实际开始执行任务
            startTask: async (task: BackgroundTask) => {
                const { params, apiKey, webappId } = task;
                const taskId = task.id;

                // 检查必要参数
                if (!apiKey || !webappId || !params) {
                    console.error('[Task] Missing required parameters');
                    get().updateTask(taskId, {
                        status: 'FAILED',
                        error: '任务参数不完整',
                        endTime: Date.now()
                    });
                    return;
                }

                set((state) => ({
                    runningCount: state.runningCount + 1,
                }));

                get().updateTask(taskId, { status: 'RUNNING', progress: 10, startTime: Date.now() });

                const onTaskComplete = () => {
                    // 清理定时器
                    const timers = taskTimers.get(taskId);
                    if (timers) {
                        if (timers.pollInterval) clearInterval(timers.pollInterval);
                        if (timers.timeout) clearTimeout(timers.timeout);
                        taskTimers.delete(taskId);
                    }
                    
                    set(s => ({ runningCount: s.runningCount - 1 }));
                    setTimeout(() => get().processNextInQueue(), 500);
                };

                try {
                    const submission = await submitTask(apiKey, webappId, params);
                    const remoteTaskId = submission.taskId;

                    console.log('[Task] Submitted, remoteTaskId:', remoteTaskId);
                    get().updateTask(taskId, { remoteTaskId, progress: 30 });

                    let pollCount = 0;
                    const pollInterval = setInterval(async () => {
                        try {
                            pollCount++;
                            const result = await queryTaskOutputs(apiKey, remoteTaskId);
                            console.log(`[Task] Poll #${pollCount}, code:`, result.code);

                            switch (result.code) {
                                case API_CODE.SUCCESS:
                                    get().updateTask(taskId, {
                                        status: 'SUCCESS',
                                        progress: 100,
                                        result: result.data as TaskOutput[],
                                        endTime: Date.now()
                                    });
                                    onTaskComplete();
                                    break;

                                case API_CODE.RUNNING:
                                    get().updateTask(taskId, { progress: Math.min(90, 30 + pollCount * 5) });
                                    break;

                                case API_CODE.QUEUED:
                                    get().updateTask(taskId, { progress: 20 });
                                    break;

                                case API_CODE.FAILED:
                                case API_CODE.QUEUE_MAXED:
                                    let errorMsg = result.msg || '任务执行失败';
                                    const failedData = result.data as { failedReason?: { exception_message?: string; exception_type?: string; node_name?: string } };
                                    if (failedData?.failedReason) {
                                        const reason = failedData.failedReason;
                                        errorMsg = reason.exception_message || reason.exception_type || errorMsg;
                                        if (reason.node_name) {
                                            errorMsg = `[${reason.node_name}] ${errorMsg}`;
                                        }
                                    }
                                    get().updateTask(taskId, {
                                        status: 'FAILED',
                                        error: errorMsg,
                                        endTime: Date.now()
                                    });
                                    onTaskComplete();
                                    break;
                            }
                        } catch (e) {
                            console.warn('[Task] Poll error:', e);
                        }
                    }, 3000);

                    const timeout = setTimeout(() => {
                        const current = get().tasks.find(t => t.id === taskId);
                        if (current && current.status === 'RUNNING') {
                            get().updateTask(taskId, {
                                status: 'FAILED',
                                error: '任务超时（60分钟）',
                                endTime: Date.now()
                            });
                            onTaskComplete();
                        }
                    }, 3600000);

                    // 存储定时器引用
                    taskTimers.set(taskId, { pollInterval, timeout });

                } catch (e: unknown) {
                    console.error('[Task] Submission Failed:', e);
                    const errorMessage = e instanceof Error ? e.message : '提交任务失败';
                    get().updateTask(taskId, {
                        status: 'FAILED',
                        error: errorMessage,
                        endTime: Date.now()
                    });
                    onTaskComplete();
                }
            },

            addTask: async (appId, appName, apiKey, webappId, params) => {
                const { runningCount, tasks } = get();
                const taskId = crypto.randomUUID();

                // 计算队列位置
                const queuedCount = tasks.filter(t => t.status === 'QUEUED').length;

                const newTask: BackgroundTask = {
                    id: taskId,
                    appId,
                    appName,
                    status: runningCount >= MAX_CONCURRENT ? 'QUEUED' : 'PENDING',
                    progress: 0,
                    startTime: Date.now(),
                    params,
                    // 存储额外信息用于后续执行
                    apiKey,
                    webappId,
                    queuePosition: runningCount >= MAX_CONCURRENT ? queuedCount + 1 : undefined,
                };

                set((state) => ({
                    tasks: [newTask, ...state.tasks],
                }));

                // 如果没超出并发限制，立即开始执行
                if (runningCount < MAX_CONCURRENT) {
                    get().startTask(newTask);
                } else {
                    console.log(`[Queue] Task queued at position ${queuedCount + 1}`);
                }
            },

            addBatchTasks: (appId, appName, apiKey, webappId, paramsList) => {
                console.log(`[Batch] Adding ${paramsList.length} tasks`);

                paramsList.forEach((params, index) => {
                    setTimeout(() => {
                        get().addTask(appId, appName, apiKey, webappId, params);
                    }, index * 100);
                });
            },

            removeTask: (taskId) => {
                const task = get().tasks.find(t => t.id === taskId);
                
                // 清理定时器
                const timers = taskTimers.get(taskId);
                if (timers) {
                    if (timers.pollInterval) clearInterval(timers.pollInterval);
                    if (timers.timeout) clearTimeout(timers.timeout);
                    taskTimers.delete(taskId);
                }
                
                set((state) => ({
                    tasks: state.tasks.filter((t) => t.id !== taskId),
                }));
                if (task?.status === 'RUNNING') {
                    set(s => ({ runningCount: s.runningCount - 1 }));
                    get().processNextInQueue();
                }
            },

            cancelTask: async (taskId) => {
                const task = get().tasks.find(t => t.id === taskId);
                if (!task) return;

                // 清理定时器
                const timers = taskTimers.get(taskId);
                if (timers) {
                    if (timers.pollInterval) clearInterval(timers.pollInterval);
                    if (timers.timeout) clearTimeout(timers.timeout);
                    taskTimers.delete(taskId);
                }

                // 如果有远程 taskId，调用 API 取消
                if (task.remoteTaskId && task.apiKey) {
                    try {
                        await cancelTaskApi(task.apiKey, task.remoteTaskId);
                        console.log('[Task] Cancelled:', task.remoteTaskId);
                    } catch (e) {
                        console.warn('[Task] Cancel API failed:', e);
                    }
                }

                // 更新状态为已取消（显示为失败）
                get().updateTask(taskId, {
                    status: 'FAILED',
                    error: '已取消',
                    endTime: Date.now()
                });

                if (task.status === 'RUNNING' || task.status === 'QUEUED') {
                    if (task.status === 'RUNNING') {
                        set(s => ({ runningCount: s.runningCount - 1 }));
                    }
                    get().processNextInQueue();
                }
            },

            removeTaskResult: (taskId, resultIndex) => {
                set((state) => ({
                    tasks: state.tasks.map((t) => {
                        if (t.id === taskId && t.result) {
                            const newResult = [...t.result];
                            newResult.splice(resultIndex, 1);
                            // 如果没有结果了，删除整个任务
                            if (newResult.length === 0) {
                                return null;
                            }
                            return { ...t, result: newResult };
                        }
                        return t;
                    }).filter(Boolean) as BackgroundTask[],
                }));
            },

            clearHistory: () => {
                set((state) => ({
                    tasks: state.tasks.filter((t) => t.status === 'RUNNING' || t.status === 'PENDING' || t.status === 'QUEUED'),
                }));
            },
        }),
        {
            name: STORAGE_KEY,
            // 只持久化已完成的任务（成功/失败），运行中的任务刷新后重置
            partialize: (state) => ({
                tasks: state.tasks.filter(t => t.status === 'SUCCESS' || t.status === 'FAILED'),
            }),
            // 加载时恢复
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // 恢复后重置 runningCount
                    state.runningCount = 0;
                    console.log('[TaskStore] Restored', state.tasks.length, 'completed tasks from storage');
                }
            },
        }
    )
);
