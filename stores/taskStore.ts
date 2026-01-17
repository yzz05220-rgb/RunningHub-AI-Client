
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BackgroundTask, NodeInfo } from '../types';
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
                const { params } = task;
                const apiKey = (task as any).apiKey;
                const webappId = (task as any).webappId;
                const taskId = task.id;

                set((state) => ({
                    runningCount: state.runningCount + 1,
                }));

                get().updateTask(taskId, { status: 'RUNNING', progress: 10, startTime: Date.now() });

                const onTaskComplete = () => {
                    set(s => ({ runningCount: s.runningCount - 1 }));
                    setTimeout(() => get().processNextInQueue(), 500);
                };

                try {
                    const submission = await submitTask(apiKey, webappId, params!);
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
                                    clearInterval(pollInterval);

                                    // Normalize result.data to ensure {fileUrl: string}[] format
                                    let normalizedResults: { fileUrl: string, fileType?: string }[] = [];
                                    const rawData = result.data;

                                    if (Array.isArray(rawData)) {
                                        normalizedResults = rawData.map((item: any) => {
                                            // Case 1: Already correct format {fileUrl: "..."}
                                            if (item && typeof item.fileUrl === 'string') {
                                                return { fileUrl: item.fileUrl, fileType: item.fileType };
                                            }
                                            // Case 2: Item is a string URL directly
                                            if (typeof item === 'string') {
                                                return { fileUrl: item };
                                            }
                                            // Case 3: Item has url instead of fileUrl
                                            if (item && typeof item.url === 'string') {
                                                return { fileUrl: item.url, fileType: item.fileType || item.type };
                                            }
                                            // Case 4: Skip invalid items
                                            return null;
                                        }).filter(Boolean) as { fileUrl: string, fileType?: string }[];
                                    } else if (rawData && typeof rawData === 'object') {
                                        // Case 5: Single object with outputs array
                                        if (Array.isArray(rawData.outputs)) {
                                            normalizedResults = rawData.outputs.map((item: any) => {
                                                if (typeof item === 'string') return { fileUrl: item };
                                                if (item && typeof item.fileUrl === 'string') return item;
                                                if (item && typeof item.url === 'string') return { fileUrl: item.url };
                                                return null;
                                            }).filter(Boolean);
                                        }
                                        // Case 6: Single object with fileUrl
                                        else if (typeof rawData.fileUrl === 'string') {
                                            normalizedResults = [{ fileUrl: rawData.fileUrl }];
                                        }
                                    }

                                    console.log('[Task] Normalized results:', normalizedResults);

                                    get().updateTask(taskId, {
                                        status: 'SUCCESS',
                                        progress: 100,
                                        result: normalizedResults,
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
                                    clearInterval(pollInterval);
                                    let errorMsg = typeof result.msg === 'string' ? result.msg : '任务执行失败';
                                    if (result.data?.failedReason) {
                                        const reason = result.data.failedReason;
                                        const exMsg = reason.exception_message || reason.exception_type;
                                        if (typeof exMsg === 'string') {
                                            errorMsg = exMsg;
                                        } else if (exMsg) {
                                            errorMsg = JSON.stringify(exMsg);
                                        }
                                        if (reason.node_name && typeof reason.node_name === 'string') {
                                            errorMsg = `[${reason.node_name}] ${errorMsg}`;
                                        }
                                    }
                                    get().updateTask(taskId, {
                                        status: 'FAILED',
                                        error: String(errorMsg),
                                        endTime: Date.now()
                                    });
                                    onTaskComplete();
                                    break;
                            }
                        } catch (e) {
                            console.warn('[Task] Poll error:', e);
                        }
                    }, 3000);

                    setTimeout(() => {
                        clearInterval(pollInterval);
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

                } catch (e: any) {
                    console.error('[Task] Submission Failed:', e);
                    get().updateTask(taskId, {
                        status: 'FAILED',
                        error: e.message || '提交任务失败',
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
                } as any;

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

                // 如果有远程 taskId，调用 API 取消
                if (task.remoteTaskId && (task as any).apiKey) {
                    try {
                        await cancelTaskApi((task as any).apiKey, task.remoteTaskId);
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
