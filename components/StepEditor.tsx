import React, { useState, useEffect, useRef } from 'react';
import { NodeInfo, InstalledApp } from '../types';
import { useTaskStore } from '../stores/taskStore';
import { uploadFile } from '../services/api';
import {
    Upload, Type, List, FileImage, Play, Mic, PlayCircle, AlertCircle,
    Loader2, Sliders, X, UploadCloud, FileAudio, FileVideo, ChevronDown,
    Image as ImageIcon, Layers, Settings, Zap, ChevronLeft, ChevronRight,
    Download, Maximize2, User, Clock, FolderOpen, Trash2
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface StepEditorProps {
    nodes: NodeInfo[];
    apiKey: string;
    isConnected: boolean;
    onBack: () => void;
    onRun?: (updatedNodes: NodeInfo[]) => void;
    currentApp?: InstalledApp;
    covers?: string[];
}

interface BatchItem {
    id: string;
    file: File;
    preview: string;
    uploadedName: string | null;
    uploading: boolean;
    error: string | null;
}

const StepEditor: React.FC<StepEditorProps> = ({ nodes, apiKey, isConnected, currentApp, covers = [] }) => {
    const [localNodes, setLocalNodes] = useState<NodeInfo[]>(nodes);
    const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Task Store
    const { addTask, addBatchTasks, tasks } = useTaskStore();
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // 批量上传状态
    const [batchMode, setBatchMode] = useState(false);
    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const [batchUploading, setBatchUploading] = useState(false);

    // Preview handling
    const [previews, setPreviews] = useState<Record<string, string>>({});
    const [dragActive, setDragActive] = useState<Record<string, boolean>>({});
    const previewsRef = useRef(previews);

    // 轮播状态
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

    // 获取历史结果
    const historyOutputs = tasks
        .filter(t => t.status === 'SUCCESS' && t.result && t.result.length > 0)
        .flatMap(t => t.result!.map(r => ({ url: r.fileUrl, type: getFileType(r.fileUrl), taskId: t.id })));

    // 轮播图片列表：封面 + 历史结果
    const carouselImages = [...covers, ...historyOutputs.map(o => o.url)];

    useEffect(() => { previewsRef.current = previews; }, [previews]);
    useEffect(() => {
        setLocalNodes(nodes);
    }, [nodes]);
    useEffect(() => {
        return () => {
            Object.values(previewsRef.current).forEach(url => URL.revokeObjectURL(url as string));
            batchItems.forEach(item => URL.revokeObjectURL(item.preview));
        };
    }, []);

    useEffect(() => {
        if (historyOutputs.length > 0 && carouselImages.length > 0) {
            setCarouselIndex(covers.length);
        }
    }, [historyOutputs.length]);

    function getFileType(url: string) {
        if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(url)) return 'image';
        if (/\.(mp4|webm|mov|avi|mkv)$/i.test(url)) return 'video';
        if (/\.(mp3|wav|ogg|flac|aac)$/i.test(url)) return 'audio';
        return 'unknown';
    }

    const handleTextChange = (index: number, val: string) => {
        const newNodes = [...localNodes];
        newNodes[index].fieldValue = val;
        setLocalNodes(newNodes);
    };

    const processFile = async (index: number, file: File) => {
        const node = localNodes[index];
        const key = node.nodeId + '_' + index;

        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setPreviews(prev => ({ ...prev, [key]: url }));
        }

        setUploadingState(prev => ({ ...prev, [key]: true }));
        setErrors(prev => ({ ...prev, [key]: '' }));

        try {
            const result = await uploadFile(apiKey, file);
            const newNodes = [...localNodes];
            newNodes[index].fieldValue = result.fileName;
            setLocalNodes(newNodes);
        } catch (err: any) {
            setErrors(prev => ({ ...prev, [key]: err.message || '上传失败' }));
        } finally {
            setUploadingState(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleDrag = (e: React.DragEvent, index: number, active: boolean) => {
        e.preventDefault(); e.stopPropagation();
        const key = localNodes[index].nodeId + '_' + index;
        if (dragActive[key] !== active) setDragActive(prev => ({ ...prev, [key]: active }));
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault(); e.stopPropagation();
        const key = localNodes[index].nodeId + '_' + index;
        setDragActive(prev => ({ ...prev, [key]: false }));
        if (e.dataTransfer.files?.[0]) processFile(index, e.dataTransfer.files[0]);
    };

    // ===== 批量上传相关 =====
    const handleBatchFilesSelect = (files: FileList | null) => {
        if (!files) return;
        const newItems: BatchItem[] = Array.from(files).map(file => ({
            id: crypto.randomUUID(),
            file,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
            uploadedName: null,
            uploading: false,
            error: null
        }));
        setBatchItems(prev => [...prev, ...newItems]);
    };

    const removeBatchItem = (id: string) => {
        const item = batchItems.find(i => i.id === id);
        if (item?.preview) URL.revokeObjectURL(item.preview);
        setBatchItems(prev => prev.filter(i => i.id !== id));
    };

    const clearBatchItems = () => {
        batchItems.forEach(item => {
            if (item.preview) URL.revokeObjectURL(item.preview);
        });
        setBatchItems([]);
    };

    // 上传所有批量图片并运行任务
    const handleBatchRun = async () => {
        if (!currentApp || batchItems.length === 0) return;

        setBatchUploading(true);

        // 找到第一个图片类型的节点
        const imageNodeIndex = localNodes.findIndex(n => n.fieldType === 'IMAGE');
        if (imageNodeIndex === -1) {
            triggerToast('此应用不支持图片输入');
            setBatchUploading(false);
            return;
        }

        try {
            // 1. 并行上传所有图片
            const uploadPromises = batchItems.map(async (item, idx) => {
                setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, uploading: true } : i));
                try {
                    const result = await uploadFile(apiKey, item.file);
                    setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, uploadedName: result.fileName, uploading: false } : i));
                    return result.fileName;
                } catch (err: any) {
                    setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, error: err.message, uploading: false } : i));
                    return null;
                }
            });

            const uploadedNames = await Promise.all(uploadPromises);
            const successfulUploads = uploadedNames.filter(n => n !== null) as string[];

            if (successfulUploads.length === 0) {
                triggerToast('所有图片上传失败');
                setBatchUploading(false);
                return;
            }

            // 2. 创建批量任务参数列表
            const paramsList: NodeInfo[][] = successfulUploads.map(fileName => {
                const taskParams = JSON.parse(JSON.stringify(localNodes)) as NodeInfo[];
                taskParams[imageNodeIndex].fieldValue = fileName;
                return taskParams;
            });

            // 3. 提交批量任务
            addBatchTasks(currentApp.id, currentApp.name, apiKey, currentApp.webappId, paramsList);

            triggerToast(`已提交 ${successfulUploads.length} 个任务，将自动按并发限制运行`);
            clearBatchItems();
            setBatchMode(false);

        } catch (err: any) {
            triggerToast('批量运行失败: ' + err.message);
        } finally {
            setBatchUploading(false);
        }
    };

    const handleRun = () => {
        if (!currentApp) return;
        if (Object.values(uploadingState).some(Boolean)) {
            triggerToast('请等待上传完成');
            return;
        }
        addTask(currentApp.id, currentApp.name, apiKey, currentApp.webappId, localNodes);
        triggerToast('任务已提交 🚀');
    };

    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const parseListOptions = (node: NodeInfo): string[] => {
        if (node.fieldType !== 'LIST' || !node.fieldData) return [];
        try {
            const parsed: any = JSON.parse(node.fieldData);
            if (Array.isArray(parsed)) {
                const items = Array.isArray(parsed[0]) ? parsed[0] : parsed;
                return items.map((item: any) => String(item));
            }
            return [];
        } catch (e) {
            if (typeof node.fieldData === 'string' && node.fieldData.includes(',')) {
                return node.fieldData.split(',').map(s => s.trim()).filter(Boolean);
            }
            return [];
        }
    };

    // --- Grouping Logic ---
    const fileTypes = ['IMAGE', 'VIDEO', 'AUDIO'];
    const groupedNodes = localNodes.reduce((acc, node, idx) => {
        const type = parseListOptions(node).length > 0 ? 'LIST' : node.fieldType;
        const group = fileTypes.includes(type) ? 'inputs' : 'configs';
        acc[group].push({ node, idx, type });
        return acc;
    }, { inputs: [] as any[], configs: [] as any[] });

    // 轮播导航
    const nextSlide = () => setCarouselIndex(i => (i + 1) % Math.max(1, carouselImages.length));
    const prevSlide = () => setCarouselIndex(i => (i - 1 + carouselImages.length) % Math.max(1, carouselImages.length));

    const handleDownload = async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', url.split('/').pop() || 'download');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch { window.open(url, '_blank'); }
    };

    if (!isConnected) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-inner">
                    <Zap className="w-10 h-10 text-slate-700" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">未连接工作站</h3>
                <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                    请在左侧侧边栏选择一个应用以加载参数。
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full overflow-hidden relative">
            {/* Toast */}
            {showToast && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a1d24] text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 animate-in fade-in slide-in-from-top-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-emerald-400 fill-current" />
                    </div>
                    <span className="text-sm font-bold tracking-tight">{toastMessage}</span>
                </div>
            )}

            {/* ===== 左侧：参数编辑区 ===== */}
            <div className="w-[380px] flex flex-col border-r border-white/5 bg-[#0f1116] shrink-0">
                {/* 应用信息头 */}
                <div className="p-4 border-b border-white/5 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <User className="w-3.5 h-3.5" />
                        <span>RunningHub 创作者</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-emerald-400 bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/10">
                        <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-medium">创作小贴士</p>
                            <p className="text-slate-500 mt-0.5">上传素材后点击运行，结果将显示在右侧</p>
                        </div>
                    </div>
                </div>

                {/* 可滚动参数区 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                    {/* 素材输入 */}
                    {groupedNodes.inputs.length > 0 && (
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-brand-400" />
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">素材输入</h3>
                                </div>
                                {/* 批量模式切换 */}
                                <button
                                    onClick={() => setBatchMode(!batchMode)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors",
                                        batchMode ? "bg-brand-500/20 text-brand-400" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                                    )}
                                >
                                    <Layers className="w-3.5 h-3.5" />
                                    批量
                                </button>
                            </div>

                            {batchMode ? (
                                /* 批量上传模式 */
                                <div className="space-y-3">
                                    {/* 批量上传区域 */}
                                    <div className="border-2 border-dashed border-white/10 rounded-lg p-4 hover:border-brand-500/50 transition-colors">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="hidden"
                                            id="batch-upload"
                                            onChange={(e) => handleBatchFilesSelect(e.target.files)}
                                        />
                                        <label htmlFor="batch-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                            <FolderOpen className="w-8 h-8 text-slate-500" />
                                            <span className="text-sm text-slate-400">点击选择多张图片</span>
                                            <span className="text-xs text-slate-600">或拖拽图片到此处</span>
                                        </label>
                                    </div>

                                    {/* 已选择的图片列表 */}
                                    {batchItems.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-slate-500">
                                                    已选择 {batchItems.length} 张图片
                                                </span>
                                                <button
                                                    onClick={clearBatchItems}
                                                    className="text-xs text-red-400 hover:text-red-300"
                                                >
                                                    清空
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                                                {batchItems.map(item => (
                                                    <div key={item.id} className="relative group aspect-square">
                                                        <img
                                                            src={item.preview}
                                                            className={cn(
                                                                "w-full h-full object-cover rounded-lg border",
                                                                item.uploading ? "border-brand-500 opacity-50" :
                                                                    item.error ? "border-red-500" :
                                                                        item.uploadedName ? "border-emerald-500" : "border-white/10"
                                                            )}
                                                        />
                                                        {item.uploading && (
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => removeBatchItem(item.id)}
                                                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* 单张上传模式 */
                                groupedNodes.inputs.map(({ node, idx }) => {
                                    const key = `${node.nodeId}_${idx}`;
                                    const previewUrl = previews[key] || (node.fieldValue?.startsWith('http') ? node.fieldValue : null);
                                    const isUploading = uploadingState[key];

                                    return (
                                        <div key={idx} className="space-y-2">
                                            <label className="text-xs text-slate-500">{node.description || node.fieldName}</label>
                                            <div className="flex gap-2 items-start">
                                                <div className="w-16 h-16 rounded-lg bg-slate-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                                    {previewUrl ? (
                                                        <img src={previewUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="w-6 h-6 text-slate-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <input type="file" className="hidden" id={`f-${idx}`} onChange={(e) => e.target.files?.[0] && processFile(idx, e.target.files[0])} />
                                                    <label
                                                        htmlFor={`f-${idx}`}
                                                        className={cn(
                                                            "flex items-center justify-center gap-2 w-full h-16 rounded-lg cursor-pointer transition-all border-2 border-dashed",
                                                            dragActive[key] ? "border-brand-500 bg-brand-500/10" : "border-white/10 hover:border-white/20 bg-white/5"
                                                        )}
                                                        onDragOver={(e) => handleDrag(e, idx, true)}
                                                        onDragLeave={(e) => handleDrag(e, idx, false)}
                                                        onDrop={(e) => handleDrop(e, idx)}
                                                    >
                                                        {isUploading ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                                                                <span className="text-xs text-brand-400">上传中...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UploadCloud className="w-4 h-4 text-slate-500" />
                                                                <span className="text-xs text-slate-400">点击或拖拽上传</span>
                                                            </>
                                                        )}
                                                    </label>
                                                </div>
                                            </div>
                                            {errors[key] && <p className="text-[10px] text-red-400">{errors[key]}</p>}
                                        </div>
                                    );
                                })
                            )}
                        </section>
                    )}

                    {/* 参数配置 */}
                    {groupedNodes.configs.length > 0 && (
                        <section className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Settings className="w-4 h-4 text-emerald-400" />
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">参数配置</h3>
                            </div>
                            {groupedNodes.configs.map(({ node, idx, type }) => (
                                <div key={idx} className="space-y-1.5">
                                    <label className="text-xs text-slate-500">{node.description || node.fieldName}</label>

                                    {type === 'STRING' && (node.nodeName.toLowerCase().includes('prompt') ? (
                                        <textarea
                                            rows={3} value={node.fieldValue} onChange={(e) => handleTextChange(idx, e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-slate-200 focus:border-brand-500/50 outline-none resize-none"
                                            placeholder="输入提示词..."
                                        />
                                    ) : (
                                        <input
                                            value={node.fieldValue} onChange={(e) => handleTextChange(idx, e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-brand-500/50 outline-none"
                                        />
                                    ))}

                                    {(type === 'INT' || type === 'FLOAT') && (
                                        <input
                                            type="number" step={type === 'FLOAT' ? 0.01 : 1}
                                            value={node.fieldValue} onChange={(e) => handleTextChange(idx, e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 font-mono focus:border-brand-500/50 outline-none"
                                        />
                                    )}

                                    {type === 'LIST' && (
                                        <div className="relative">
                                            <select
                                                value={node.fieldValue} onChange={(e) => handleTextChange(idx, e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-brand-500/50 outline-none appearance-none cursor-pointer"
                                            >
                                                {parseListOptions(node).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </section>
                    )}

                    {localNodes.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Zap className="w-10 h-10 text-slate-600 mb-3" />
                            <p className="text-sm text-slate-500">此应用无需额外参数</p>
                        </div>
                    )}
                </div>

                {/* 底部运行按钮 */}
                <div className="p-4 border-t border-white/5 bg-[#0c0e12]">
                    {batchMode && batchItems.length > 0 ? (
                        /* 批量运行按钮 */
                        <button
                            onClick={handleBatchRun}
                            disabled={batchUploading || batchItems.length === 0}
                            className="w-full group relative overflow-hidden rounded-xl"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
                            <div className="relative flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-xl transition-all active:scale-95 disabled:grayscale disabled:opacity-50">
                                {batchUploading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Layers className="w-5 h-5" />
                                )}
                                <span>{batchUploading ? '上传并运行中...' : `批量运行 (${batchItems.length} 张)`}</span>
                            </div>
                        </button>
                    ) : (
                        /* 单任务运行按钮 */
                        <button
                            onClick={handleRun}
                            disabled={!isConnected || Object.values(uploadingState).some(Boolean)}
                            className="w-full group relative overflow-hidden rounded-xl"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
                            <div className="relative flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-xl transition-all active:scale-95 disabled:grayscale disabled:opacity-50">
                                <Play className="w-5 h-5 fill-current" />
                                <span>立即运行</span>
                                <Zap className="w-4 h-4 text-yellow-300" />
                            </div>
                        </button>
                    )}
                </div>
            </div>

            {/* ===== 右侧：预览/结果区 ===== */}
            <div className="flex-1 flex flex-col bg-[#0a0c10] min-w-0">
                {/* 大图轮播 */}
                <div className="flex-1 relative flex items-center justify-center p-6 min-h-0">
                    {carouselImages.length > 0 ? (
                        <>
                            <div
                                className="relative max-w-full max-h-full rounded-2xl overflow-hidden shadow-2xl cursor-pointer group"
                                onClick={() => setFullscreenImage(carouselImages[carouselIndex])}
                            >
                                {getFileType(carouselImages[carouselIndex]) === 'video' ? (
                                    <video
                                        src={carouselImages[carouselIndex]}
                                        controls
                                        className="max-w-full max-h-[60vh] rounded-2xl"
                                    />
                                ) : (
                                    <img
                                        src={carouselImages[carouselIndex]}
                                        alt="Preview"
                                        className="max-w-full max-h-[60vh] object-contain rounded-2xl"
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Maximize2 className="w-8 h-8 text-white" />
                                </div>
                                <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs text-white font-medium">
                                    {carouselIndex < covers.length ? '封面' : `结果 ${carouselIndex - covers.length + 1}`}
                                </div>
                            </div>

                            {carouselImages.length > 1 && (
                                <>
                                    <button
                                        onClick={prevSlide}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={nextSlide}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                                    >
                                        <ChevronRight className="w-6 h-6" />
                                    </button>
                                </>
                            )}

                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 bg-black/50 backdrop-blur-sm rounded-full">
                                <span className="text-sm text-white font-medium">{carouselIndex + 1} / {carouselImages.length}</span>
                            </div>
                        </>
                    ) : (
                        <div className="text-center">
                            <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                                <ImageIcon className="w-10 h-10 text-slate-600" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">准备就绪</h3>
                            <p className="text-sm text-slate-500">配置参数并点击"运行"<br />结果将显示在这里</p>
                        </div>
                    )}
                </div>

                {/* 历史结果 - 按任务分组，可折叠 */}
                {(() => {
                    const { cancelTask, removeTaskResult, removeTask, clearHistory } = useTaskStore.getState();
                    const allTasks = tasks.filter(t => (t.status === 'SUCCESS' || t.status === 'FAILED') && (t.result?.length || t.error));
                    if (allTasks.length === 0) return null;

                    // 格式化时间
                    const formatTime = (ts: number) => {
                        const d = new Date(ts);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
                    };
                    const formatDuration = (ms: number) => {
                        const s = Math.floor(ms / 1000);
                        const m = Math.floor(s / 60);
                        return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
                    };

                    return (
                        <div className="border-t border-white/5 bg-[#0c0e12] overflow-y-auto flex-1 min-h-0">
                            {/* 标题栏 */}
                            <div className="px-4 py-2 flex items-center justify-between border-b border-white/5 sticky top-0 bg-[#0c0e12] z-10">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-brand-400" />
                                    <span className="text-sm font-medium text-white">历史记录</span>
                                    <span className="text-xs text-brand-400 bg-brand-500/20 px-1.5 py-0.5 rounded">{allTasks.length} 个结果</span>
                                </div>
                                <button
                                    onClick={() => clearHistory()}
                                    className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    清空
                                </button>
                            </div>

                            {/* 任务列表 */}
                            <div className="p-3 space-y-2">
                                {allTasks.map((task, tIdx) => {
                                    const [expanded, setExpanded] = React.useState(false);
                                    const duration = task.endTime ? task.endTime - task.startTime : 0;
                                    let globalIdx = covers.length;
                                    // 计算之前任务的结果数量
                                    for (let i = 0; i < tIdx; i++) {
                                        globalIdx += allTasks[i].result?.length || 0;
                                    }

                                    return (
                                        <div key={task.id} className="bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden">
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
                                })}
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* 全屏预览 Modal */}
            {fullscreenImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
                    onClick={() => setFullscreenImage(null)}
                >
                    <button
                        onClick={() => setFullscreenImage(null)}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    {getFileType(fullscreenImage) === 'video' ? (
                        <video src={fullscreenImage} controls autoPlay className="max-w-full max-h-[90vh] rounded-lg" onClick={e => e.stopPropagation()} />
                    ) : (
                        <img src={fullscreenImage} className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(fullscreenImage); }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-full font-medium hover:bg-slate-200"
                    >
                        <Download className="w-4 h-4" />
                        下载
                    </button>
                </div>
            )}
        </div>
    );
};

export default StepEditor;
