import React, { useState } from 'react';
import { BackgroundTask, TaskOutput } from '../types';
import { formatTime, formatDuration } from '../utils/format';
import { getFileType } from '../utils/file';
import { useTaskStore } from '../stores/taskStore';
import { ChevronDown, ImageIcon, AlertCircle, Trash2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface TaskHistoryItemProps {
    task: BackgroundTask;
    globalIdx: number;
    carouselIndex: number;
    setCarouselIndex: (index: number) => void;
}

const TaskHistoryItem: React.FC<TaskHistoryItemProps> = ({
    task,
    globalIdx,
    carouselIndex,
    setCarouselIndex,
}) => {
    const [expanded, setExpanded] = useState(false);
    const { removeTaskResult, removeTask } = useTaskStore();
    
    const duration = task.endTime ? task.endTime - task.startTime : 0;

    return (
        <div className="bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden">
            {/* 任务头部 - 可点击展开 */}
            <div
                className="px-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                    task.status === 'SUCCESS' ? "bg-emerald-500/20" : "bg-red-500/20"
                )}>
                    {task.status === 'SUCCESS' ? (
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{task.appName}</div>
                    <div className="text-[10px] text-slate-500">{task.result?.length || 0} 个结果 · {formatDuration(duration)}</div>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", expanded && "rotate-180")} />
            </div>

            {/* 展开的详情 */}
            {expanded && (
                <div className="border-t border-white/5 bg-black/20">
                    {/* 详细信息 */}
                    <div className="px-3 py-2 text-[10px] text-slate-500 space-y-1 border-b border-white/5">
                        <div><span className="text-slate-600">时间:</span> {formatTime(task.startTime)}</div>
                        {task.remoteTaskId && <div><span className="text-slate-600">TaskID:</span> {task.remoteTaskId}</div>}
                        <div><span className="text-slate-600">运行时长:</span> {formatDuration(duration)}</div>
                        {task.error && <div className="text-red-400"><span className="text-slate-600">错误:</span> {task.error}</div>}
                    </div>

                    {/* 结果图片 - 带删除按钮 */}
                    {task.result && task.result.length > 0 && (
                        <div className="p-2 flex gap-1.5 flex-wrap">
                            {task.result.map((output, oIdx) => {
                                const currentIdx = globalIdx + oIdx;
                                return (
                                    <div
                                        key={oIdx}
                                        className="relative group"
                                    >
                                        <div
                                            onClick={() => setCarouselIndex(currentIdx)}
                                            className={cn(
                                                "w-14 h-14 rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                                                carouselIndex === currentIdx ? "border-brand-500" : "border-white/10 hover:border-white/30"
                                            )}
                                        >
                                            {getFileType(output.fileUrl) === 'video' ? (
                                                <video src={output.fileUrl} className="w-full h-full object-cover" muted />
                                            ) : (
                                                <img src={output.fileUrl} className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                        {/* 删除按钮 */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeTaskResult(task.id, oIdx); }}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                        >
                                            <X className="w-2.5 h-2.5 text-white" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 删除整个任务 */}
                    <div className="px-3 py-2 border-t border-white/5 flex justify-end">
                        <button
                            onClick={() => removeTask(task.id)}
                            className="text-[10px] text-slate-500 hover:text-red-400 flex items-center gap-1"
                        >
                            <Trash2 className="w-3 h-3" />
                            删除此任务
                        </button>
                    </div>
                </div>
            )}

            {/* 折叠状态的结果预览 */}
            {!expanded && task.result && task.result.length > 0 && (
                <div className="px-3 pb-2 flex gap-1 overflow-x-auto">
                    {task.result.slice(0, 6).map((output, oIdx) => {
                        const currentIdx = globalIdx + oIdx;
                        return (
                            <div
                                key={oIdx}
                                onClick={(e) => { e.stopPropagation(); setCarouselIndex(currentIdx); }}
                                className={cn(
                                    "w-10 h-10 rounded-md overflow-hidden cursor-pointer border transition-all shrink-0",
                                    carouselIndex === currentIdx ? "border-brand-500" : "border-white/10 hover:border-white/30"
                                )}
                            >
                                {getFileType(output.fileUrl) === 'video' ? (
                                    <video src={output.fileUrl} className="w-full h-full object-cover" muted />
                                ) : (
                                    <img src={output.fileUrl} className="w-full h-full object-cover" />
                                )}
                            </div>
                        );
                    })}
                    {task.result.length > 6 && (
                        <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center text-[10px] text-slate-500 shrink-0">
                            +{task.result.length - 6}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TaskHistoryItem;
