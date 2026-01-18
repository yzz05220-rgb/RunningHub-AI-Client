import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { ChevronUp, ChevronDown, CheckCircle, XCircle, Loader2, Play, AlertTriangle, Clock, Trash2, X } from 'lucide-react';
import { BackgroundTask } from '../types';

// 格式化时长
function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}分${remainingSeconds}秒`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}时${remainingMinutes}分`;
}

const TaskFloater: React.FC = () => {
    const { tasks, runningCount, removeTask, cancelTask, clearHistory } = useTaskStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState<{ id: string, name: string } | null>(null);
    const [showErrorToast, setShowErrorToast] = useState<{ id: string, name: string, error: string } | null>(null);
    const [, setTick] = useState(0); // 强制刷新用于更新计时

    // 追踪已显示过 Toast 的任务 ID，避免重复显示
    const shownToastIds = React.useRef<Set<string>>(new Set());

    // 拖拽相关状态
    const [position, setPosition] = useState(() => {
        const saved = localStorage.getItem('taskFloaterPosition');
        if (saved) {
            const pos = JSON.parse(saved);
            // 确保初始位置在可视区域内
            return {
                x: Math.min(pos.x, window.innerWidth - 100),
                y: Math.min(pos.y, window.innerHeight - 80)
            };
        }
        // 默认右下角，但确保在可视区域内
        return {
            x: Math.max(20, window.innerWidth - 420),
            y: Math.max(20, window.innerHeight - 200)
        };
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // 窗口大小变化时确保悬浮窗在可视区域内
    useEffect(() => {
        const handleResize = () => {
            setPosition(prev => ({
                x: Math.min(prev.x, Math.max(20, window.innerWidth - 100)),
                y: Math.min(prev.y, Math.max(20, window.innerHeight - 80))
            }));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 保存位置到 localStorage
    useEffect(() => {
        localStorage.setItem('taskFloaterPosition', JSON.stringify(position));
    }, [position]);

    // 每秒刷新一次用于更新运行时长
    useEffect(() => {
        const hasRunning = tasks.some(t => t.status === 'RUNNING' || t.status === 'PENDING');
        if (hasRunning) {
            const timer = setInterval(() => setTick(t => t + 1), 1000);
            return () => clearInterval(timer);
        }
    }, [tasks]);

    // 监听失败的任务 - 成功不弹 Toast
    useEffect(() => {
        // 1分钟后自动消失 (60000ms)
        const TOAST_DURATION = 60000;

        // 只检查失败的任务
        const failed = tasks.find(t =>
            t.status === 'FAILED' &&
            t.endTime &&
            !shownToastIds.current.has(t.id)
        );
        if (failed && !showErrorToast) {
            shownToastIds.current.add(failed.id);
            setShowErrorToast({ id: failed.id, name: failed.appName, error: failed.error || '未知错误' });
            const timer = setTimeout(() => setShowErrorToast(null), TOAST_DURATION);
            return () => clearTimeout(timer);
        }

        // 成功的任务只标记已处理，不显示 Toast
        const completed = tasks.find(t =>
            t.status === 'SUCCESS' &&
            t.endTime &&
            !shownToastIds.current.has(t.id)
        );
        if (completed) {
            shownToastIds.current.add(completed.id);
        }
    }, [tasks, showErrorToast]);

    // 拖拽处理
    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return; // 忽略按钮点击
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const newX = e.clientX - dragStart.x;
            const newY = e.clientY - dragStart.y;

            // 边界限制
            const maxX = window.innerWidth - 100;
            const maxY = window.innerHeight - 100;

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart]);

    if (tasks.length === 0) return null;

    const runningTasks = tasks.filter(t => t.status === 'RUNNING' || t.status === 'PENDING').length;
    const queuedTasks = tasks.filter(t => t.status === 'QUEUED').length;
    const failedTasks = tasks.filter(t => t.status === 'FAILED').length;
    const successTasks = tasks.filter(t => t.status === 'SUCCESS').length;

    return (
        <div
            className="fixed z-50 flex flex-col items-end gap-2 font-sans"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                cursor: isDragging ? 'grabbing' : 'auto'
            }}
        >

            {/* Success Toast - 点击关闭 */}
            {showSuccessToast && (
                <div
                    onClick={() => setShowSuccessToast(null)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-4 rounded-2xl shadow-2xl shadow-emerald-500/30 flex items-center gap-3 animate-in slide-in-from-bottom-4 border border-emerald-400/30 cursor-pointer hover:opacity-90 transition-opacity"
                >
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold">{showSuccessToast.name}</p>
                        <p className="text-xs opacity-80">任务完成</p>
                    </div>
                    <X className="w-4 h-4 opacity-60" />
                </div>
            )}

            {/* Error Toast - 点击关闭 */}
            {showErrorToast && (
                <div
                    onClick={() => setShowErrorToast(null)}
                    className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-5 py-4 rounded-2xl shadow-2xl shadow-red-500/30 max-w-xs animate-in slide-in-from-bottom-4 border border-red-400/30 cursor-pointer hover:opacity-90 transition-opacity"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold flex-1">{showErrorToast.name} 失败</p>
                        <X className="w-4 h-4 opacity-60" />
                    </div>
                    <p className="text-xs opacity-90 leading-relaxed pl-[52px]">{typeof showErrorToast.error === 'string' ? showErrorToast.error : JSON.stringify(showErrorToast.error)}</p>
                </div>
            )}

            {/* Main Floater */}
            <div className={`bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'w-96' : 'w-auto'} ${isDragging ? 'scale-[1.02] shadow-emerald-500/20' : ''}`}>

                {/* Header (Always Visible) */}
                <div
                    className={`flex items-center gap-3 p-4 hover:bg-white/5 transition-colors ${isExpanded ? 'border-b border-white/10' : ''} cursor-grab active:cursor-grabbing`}
                    onMouseDown={handleMouseDown}
                >
                    <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${runningTasks > 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-500 animate-pulse shadow-emerald-500/30' : failedTasks > 0 ? 'bg-gradient-to-br from-red-500 to-rose-500 shadow-red-500/30' : 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30'}`}>
                        {runningTasks > 0 ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : failedTasks > 0 ? (
                            <AlertTriangle className="w-5 h-5 text-white" />
                        ) : (
                            <CheckCircle className="w-5 h-5 text-white" />
                        )}
                        {(runningTasks > 0 || failedTasks > 0) && (
                            <span className={`absolute -top-1 -right-1 w-5 h-5 ${failedTasks > 0 ? 'bg-red-600' : 'bg-emerald-600'} text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-slate-900 shadow-lg`}>
                                {runningTasks || failedTasks}
                            </span>
                        )}
                    </div>

                    {isExpanded ? (
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-white">任务管理器</h3>
                            <p className="text-xs text-slate-400">
                                {runningTasks > 0 ? `${runningTasks} 个运行中` : ''}
                                {runningTasks > 0 && successTasks > 0 ? ' · ' : ''}
                                {successTasks > 0 ? `${successTasks} 个完成` : ''}
                                {failedTasks > 0 ? ` · ${failedTasks} 个失败` : ''}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">
                                {runningTasks > 0 ? '正在运行...' : failedTasks > 0 ? '有任务失败' : '全部完成'}
                            </span>
                        </div>
                    )}

                    <button
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                </div>

                {/* Expanded List */}
                {isExpanded && (
                    <div className="bg-slate-50/50 dark:bg-slate-900/50">
                        {/* 清空按钮 */}
                        {(successTasks > 0 || failedTasks > 0) && runningTasks === 0 && (
                            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex justify-end">
                                <button
                                    onClick={(e) => { e.stopPropagation(); clearHistory(); }}
                                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    清空已完成
                                </button>
                            </div>
                        )}
                        <div className="max-h-72 overflow-y-auto p-2">
                            {tasks.map(task => (
                                <TaskItem key={task.id} task={task} onRemove={() => removeTask(task.id)} onCancel={() => cancelTask(task.id)} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const TaskItem: React.FC<{ task: BackgroundTask, onRemove: () => void, onCancel: () => void }> = ({ task, onRemove, onCancel }) => {
    // 计算运行时长
    const duration = task.endTime
        ? task.endTime - task.startTime
        : Date.now() - task.startTime;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg mb-2 shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden group">
            {/* 主内容 */}
            <div className="flex items-center gap-3 p-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${task.status === 'RUNNING' ? 'bg-brand-500/10' :
                    task.status === 'SUCCESS' ? 'bg-emerald-500/10' :
                        task.status === 'FAILED' ? 'bg-red-500/10' :
                            task.status === 'QUEUED' ? 'bg-amber-500/10' : 'bg-slate-100 dark:bg-slate-700'
                    }`}>
                    {task.status === 'RUNNING' && <Loader2 className="w-5 h-5 animate-spin text-brand-500" />}
                    {task.status === 'PENDING' && <Play className="w-4 h-4 text-slate-400" />}
                    {task.status === 'QUEUED' && <Clock className="w-5 h-5 text-amber-500" />}
                    {task.status === 'SUCCESS' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    {task.status === 'FAILED' && <XCircle className="w-5 h-5 text-red-500" />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
                            {task.appName}
                        </h4>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${task.status === 'RUNNING' ? 'bg-brand-500/10 text-brand-500' :
                            task.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' :
                                task.status === 'FAILED' ? 'bg-red-500/10 text-red-500' :
                                    task.status === 'QUEUED' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-100 text-slate-400'
                            }`}>
                            {task.status === 'RUNNING' ? '运行中' :
                                task.status === 'PENDING' ? '等待中' :
                                    task.status === 'SUCCESS' ? '完成' :
                                        task.status === 'QUEUED' ? `排队 #${(task as any).queuePosition || '?'}` : '失败'}
                        </span>
                    </div>

                    {/* 运行时长 - 只对运行中和已完成的任务显示 */}
                    {task.status === 'QUEUED' ? (
                        <div className="flex items-center gap-2 text-xs text-amber-500">
                            <Clock className="w-3 h-3" />
                            <span>等待前序任务完成</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(duration)}</span>
                            {task.status === 'RUNNING' && (
                                <span className="text-brand-400">· 进度 {task.progress}%</span>
                            )}
                            {task.status === 'SUCCESS' && task.costCoins && (
                                <span className="text-amber-400">· 消耗 {parseFloat(task.costCoins).toFixed(2)} 币</span>
                            )}
                        </div>
                    )}

                    {/* Progress Bar - 只对运行中的任务显示 */}
                    {task.status === 'RUNNING' && (
                        <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                            <div
                                className="h-full transition-all duration-500 bg-brand-500"
                                style={{ width: `${task.progress}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {(task.status === 'RUNNING' || task.status === 'QUEUED') && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onCancel(); }}
                        className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                        取消
                    </button>
                )}
                {(task.status === 'SUCCESS' || task.status === 'FAILED') && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="p-1.5 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-red-500/10"
                    >
                        <XCircle className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* 错误信息显示 */}
            {task.status === 'FAILED' && task.error && (
                <div className="px-3 pb-3 pt-0">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg px-3 py-2">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed break-all">
                                {typeof task.error === 'string' ? task.error : JSON.stringify(task.error)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 成功结果预览 */}
            {task.status === 'SUCCESS' && task.result && task.result.length > 0 && (
                <div className="px-3 pb-3 pt-0">
                    <div className="flex gap-2 overflow-x-auto">
                        {task.result.slice(0, 4).map((output, idx) => {
                            const url = typeof output?.fileUrl === 'string' ? output.fileUrl : '';
                            const isVideo = url.match(/\.(mp4|webm|mov)$/i) || url.startsWith('data:video/');
                            const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.startsWith('data:image/');

                            return (
                                <a
                                    key={idx}
                                    href={url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-brand-500 transition-all"
                                >
                                    {isVideo ? (
                                        <video src={url} className="w-full h-full object-cover" muted />
                                    ) : (isImage || url) ? (
                                        <img src={url} className="w-full h-full object-cover" onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }} />
                                    ) : (
                                        <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500">?</div>
                                    )}
                                </a>
                            );
                        })}
                        {task.result.length > 4 && (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500 font-bold">
                                +{task.result.length - 4}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TaskFloater;
