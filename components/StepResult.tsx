import React, { useState, useRef, useEffect } from 'react';
import { HistoryItem } from '../types';
import { Download, ExternalLink, FileIcon, History, Trash2, Maximize2, X, CheckSquare, Square, ListChecks, CheckCircle2, Loader2, ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { isElectronEnvironment } from '../utils/envDetection';

interface StepResultProps {
  history: HistoryItem[];
  onClear: () => void;
  isExpanded?: boolean;
}

// 格式化时长 mm:ss
function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 格式化日期
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '-');
}

/**
 * 图片预览模态框组件 (支持缩放、拖拽)
 */
const ImagePreviewModal: React.FC<{
  url: string;
  type: 'image' | 'video' | 'audio' | 'unknown';
  onClose: () => void;
  onDownload: () => void;
}> = ({ url, type, onClose, onDownload }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 视频/其他类型直接显示，只有图片支持缩放
  const isImage = type === 'image';

  // 鼠标滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    if (!isImage) return;
    e.stopPropagation();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(0.1, scale + delta), 5);
    setScale(newScale);
  };

  // 拖拽逻辑
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isImage) return;
    if (e.button !== 0) return; // 仅左键
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isImage) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 顶部关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[60]"
      >
        <X className="w-6 h-6" />
      </button>

      {/* 主内容区域 */}
      <div
        className="w-full h-full flex items-center justify-center relative"
        onWheel={handleWheel}
      >
        {isImage ? (
          <div
            className="cursor-move transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          >
            <img
              src={url}
              alt="Preview"
              draggable={false}
              className="max-w-[90vw] max-h-[90vh] object-contain shadow-2xl pointer-events-none"
            />
          </div>
        ) : type === 'video' ? (
          <video
            src={url}
            controls
            autoPlay
            className="max-w-full max-h-[90vh] shadow-2xl bg-black"
          />
        ) : (
          <div className="text-white flex flex-col items-center gap-4">
            <FileIcon className="w-20 h-20 text-slate-500" />
            <span>暂不支持预览此格式</span>
          </div>
        )}
      </div>

      {/* 底部工具栏 */}
      <div className="absolute bottom-8 flex gap-4 z-[60]">
        {isImage && (
          <div className="flex bg-[#14171d]/80 backdrop-blur-md rounded-full border border-white/10 p-1 mr-4 shadow-lg items-center">
            <button onClick={() => setScale(s => Math.max(0.1, s - 0.2))} className="p-3 hover:bg-white/10 rounded-full text-white transition-colors" title="缩小">
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="w-12 text-center text-xs font-mono text-slate-300">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(5, s + 0.2))} className="p-3 hover:bg-white/10 rounded-full text-white transition-colors" title="放大">
              <ZoomIn className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-white/10 mx-1"></div>
            <button onClick={resetZoom} className="p-3 hover:bg-white/10 rounded-full text-white transition-colors" title="重置">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        )}

        <button
          onClick={onDownload}
          className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-200 text-slate-900 rounded-full font-bold transition-colors shadow-lg"
        >
          <Download className="w-5 h-5" />
          下载原图
        </button>
      </div>

      {/* 提示遮罩 */}
      {isImage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
          滚轮缩放 • 拖拽移动
        </div>
      )}
    </div>
  );
};

const StepResult: React.FC<StepResultProps> = ({ history, onClear, isExpanded = false }) => {
  const [preview, setPreview] = useState<{ url: string; type: 'image' | 'video' | 'audio' | 'unknown' } | null>(null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const [downloadToast, setDownloadToast] = useState<{ show: boolean; message: string; type: 'loading' | 'success' | 'error' }>({ show: false, message: '', type: 'loading' });

  // 监听下载进度
  useEffect(() => {
    if (!isElectronEnvironment()) return;

    const handleProgress = (_event: any, data: { current: number; total: number }) => {
      setDownloadProgress(data);
    };

    const cleanup = (window as any).electronAPI.onDownloadProgress?.(handleProgress);

    return () => {
      cleanup?.();
    };
  }, []);

  const getFileType = (url: unknown): 'image' | 'video' | 'audio' | 'unknown' => {
    if (typeof url !== 'string') return 'unknown';
    // 支持 base64 data URL
    if (url.startsWith('data:image/')) return 'image';
    if (url.startsWith('data:video/')) return 'video';
    if (url.startsWith('data:audio/')) return 'audio';
    // 扩展名匹配
    if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(url)) return 'image';
    if (/\.(mp4|webm|mov|avi|mkv)$/i.test(url)) return 'video';
    if (/\.(mp3|wav|ogg|flac|aac)$/i.test(url)) return 'audio';
    return 'unknown';
  };

  const handleDownload = async (url: string) => {
    try {
      // 检查 Electron 环境和自动保存设置
      if (isElectronEnvironment() && (window as any).electronAPI?.downloadFile) {
        const autoSaveEnabled = localStorage.getItem('rh_auto_save_enabled') === 'true';
        const defaultPath = localStorage.getItem('rh_download_path');

        if (autoSaveEnabled && defaultPath) {
          const fileName = url.split('/').pop() || `download_${Date.now()}`;
          setDownloadToast({ show: true, message: '下载中...', type: 'loading' });
          try {
            const result = await (window as any).electronAPI.downloadFile(url, defaultPath, fileName);
            if (result.success) {
              setDownloadToast({ show: true, message: '已保存', type: 'success' });
              setTimeout(() => setDownloadToast({ show: false, message: '', type: 'loading' }), 2000);
            } else {
              throw new Error(result.error || '下载失败');
            }
          } catch (err) {
            console.error('Electron download failed:', err);
            setDownloadToast({ show: true, message: '下载失败', type: 'error' });
            setTimeout(() => setDownloadToast({ show: false, message: '', type: 'loading' }), 2000);
          }
          return;
        }
      }

      // 回退到浏览器下载
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const fileName = url.split('/').pop() || 'download';
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank');
    }
  };

  // 切换选中状态
  const toggleSelection = (url: string) => {
    const newSet = new Set(selectedUrls);
    if (newSet.has(url)) {
      newSet.delete(url);
    } else {
      newSet.add(url);
    }
    setSelectedUrls(newSet);
  };

  // 全选/反选
  const toggleSelectAll = () => {
    if (history.length === 0) return;

    // 收集所有 output url (过滤无效项)
    const allUrls = history.flatMap(item =>
      item.outputs
        .filter(o => o && typeof o.fileUrl === 'string')
        .map(o => o.fileUrl)
    );

    if (selectedUrls.size === allUrls.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(allUrls));
    }
  };

  // 批量下载处理
  const handleBatchDownload = async () => {
    if (selectedUrls.size === 0) return;
    setIsDownloading(true);
    setDownloadProgress(null); // 重置进度

    const files: { url: string; name: string }[] = Array.from(selectedUrls).map((url: string) => ({
      url,
      name: url.split('/').pop() || `file_${Date.now()}`
    }));

    try {
      if (isElectronEnvironment()) {
        // Electron: 调用原生下载逻辑（批量下载用于打包交付，每次弹窗选择保存位置）
        const result = await (window as any).electronAPI.downloadFiles(files);
        if (result.success) {
          console.log(result.message);
          setIsSelectionMode(false);
          setSelectedUrls(new Set());
        } else {
          console.error(result.message);
          if (result.message !== 'User canceled') {
            console.error('批量下载失败:', result.message);
            // 使用自定义方式通知用户，避免使用 alert
          }
        }
      } else {
        // Web: 打包 ZIP 下载
        const zip = new JSZip();
        const promises = files.map(async (file) => {
          const response = await fetch(file.url);
          const blob = await response.blob();
          zip.file(file.name, blob);
        });

        await Promise.all(promises);
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `RunningHub_Batch_${Date.now()}.zip`);
        setIsSelectionMode(false);
        setSelectedUrls(new Set());
      }
    } catch (error) {
      console.error('Batch download failed:', error);
      // 避免在 Electron 环境中使用 alert
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-base font-bold flex items-center gap-2 text-white">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <History className="w-4 h-4 text-white" />
            </div>
            历史记录
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">准备就绪</h3>
          <p className="text-sm text-slate-400 max-w-[220px]">配置参数并点击"运行"，结果将显示在这里</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-4 border-b border-white/10 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold flex items-center gap-2 text-white">
            {!isSelectionMode ? (
              <>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <History className="w-4 h-4 text-white" />
                </div>
                历史记录
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/25">
                  {history.length}
                </span>
              </>
            ) : (
              <span className="text-white font-bold pl-1">选择项目</span>
            )}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          {isSelectionMode ? (
            <>
              <button
                onClick={toggleSelectAll}
                className="px-3 py-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors mr-1"
              >
                {selectedUrls.size === history.flatMap(i => i.outputs).length ? '全不选' : '全选'}
              </button>
              <button
                onClick={() => { setIsSelectionMode(false); setSelectedUrls(new Set()); }}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
                title="退出选择模式"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsSelectionMode(true)}
                className="p-2 text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-all"
                title="批量管理"
              >
                <ListChecks className="w-4 h-4" />
              </button>
              <button
                onClick={onClear}
                title="清空历史"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/15 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 pb-20">
        {history.map((item) => {
          const duration = item.endTime ? item.endTime - item.startTime : 0;

          return (
            <div key={item.id} className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all duration-300">

              {/* Header: App Name & Status (Always Visible) */}
              <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/10 bg-white/[0.03]">
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-lg ${item.status === 'SUCCESS' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50'}`} />
                  <span className={`text-sm font-bold text-slate-100 ${isExpanded ? 'break-words' : 'truncate'}`}>
                    {item.appName || '未知应用'}
                  </span>
                </div>
              </div>

              {/* Metadata Section (Expanded Only) */}
              {isExpanded && !isSelectionMode && (
                <div className="px-4 py-2.5 bg-black/20 text-xs text-slate-400 space-y-2 border-b border-white/10">
                  <div className="flex justify-between items-center">
                    <span>{formatDate(item.timestamp)}</span>
                    <div className="flex items-center gap-1.5 font-mono text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                      {formatDuration(duration)}
                    </div>
                  </div>
                  {item.remoteTaskId && (
                    <div className="font-mono break-all opacity-60 text-[10px]">
                      ID: {item.remoteTaskId}
                    </div>
                  )}
                  {item.status === 'FAILED' && item.error && (
                    <div className="text-red-400 pt-2 border-t border-white/5">
                      {typeof item.error === 'string' ? item.error : JSON.stringify(item.error)}
                    </div>
                  )}
                </div>
              )}

              {/* Images Section */}
              {item.outputs.length > 0 && (
                <div className="flex flex-col">
                  {item.outputs
                    .filter(output => output && typeof output.fileUrl === 'string')
                    .map((output, idx) => {
                      const type = getFileType(output.fileUrl);
                      const isSelected = selectedUrls.has(output.fileUrl);

                      return (
                        <div
                          key={idx}
                          className={`relative group/item ${idx > 0 ? 'border-t border-white/10' : ''} ${isSelectionMode ? 'cursor-pointer' : ''}`}
                          onClick={isSelectionMode ? () => toggleSelection(output.fileUrl) : undefined}
                        >
                          {/* Image Container */}
                          <div className={`p-3 transition-colors ${isSelected ? 'bg-brand-500/10' : 'bg-slate-900/50'}`}>
                            <div className={`relative rounded-lg overflow-hidden border-2 transition-all ${isSelected ? 'border-brand-500' : 'border-transparent'}`}
                              onClick={!isSelectionMode ? () => setPreview({ url: output.fileUrl, type }) : undefined}>

                              {/* Selection Checkbox Overlay */}
                              {isSelectionMode && (
                                <div className="absolute top-2 left-2 z-20">
                                  <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors shadow-lg ${isSelected ? 'bg-brand-500 text-white' : 'bg-black/50 border border-white/30 text-transparent hover:border-white'}`}>
                                    <CheckIcon className="w-3.5 h-3.5" />
                                  </div>
                                </div>
                              )}

                              {/* Deselect Button (Only when selected) */}
                              {isSelectionMode && isSelected && (
                                <div className="absolute top-2 right-2 z-20 animate-in zoom-in duration-200">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSelection(output.fileUrl);
                                    }}
                                    className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors border border-red-400 group/remove"
                                    title="移除"
                                  >
                                    <X className="w-3.5 h-3.5 group-hover/remove:scale-110 transition-transform" />
                                  </button>
                                </div>
                              )}

                              {/* Image/Video */}
                              {type === 'image' ? (
                                <img
                                  src={output.fileUrl}
                                  className="w-full h-auto object-contain block"
                                  alt=""
                                />
                              ) : type === 'video' ? (
                                <video
                                  src={output.fileUrl}
                                  className="w-full h-auto object-contain block"
                                  muted
                                  preload="metadata"
                                />
                              ) : (
                                <div className="w-full h-32 flex items-center justify-center bg-slate-800">
                                  <FileIcon className="w-8 h-8 text-slate-500" />
                                </div>
                              )}

                              {/* Hover Overlay (Only in Non-Selection Mode) */}
                              {!isSelectionMode && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[2px]">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreview({ url: output.fileUrl, type });
                                    }}
                                    className="p-3 bg-white/10 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-colors border border-white/20"
                                    title="放大预览"
                                  >
                                    <Maximize2 className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(output.fileUrl);
                                    }}
                                    className="p-3 bg-white/10 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-colors border border-white/20"
                                    title="下载"
                                  >
                                    <Download className="w-5 h-5" />
                                  </button>
                                </div>
                              )}

                              {/* Type Badge */}
                              {!isSelectionMode && type !== 'image' && (
                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1 text-[10px] font-bold text-white uppercase pointer-events-none">
                                  {type}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Batch Action Bar (Fixed Bottom) */}
      {isSelectionMode && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#14171d]/95 backdrop-blur-xl border-t border-white/10 animate-in slide-in-from-bottom-2 z-30">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-medium text-slate-300">
              已选 <span className="text-white font-bold">{selectedUrls.size}</span> 项
            </div>
            <button
              onClick={handleBatchDownload}
              disabled={selectedUrls.size === 0 || isDownloading}
              className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:bg-slate-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isDownloading
                ? (downloadProgress
                  ? `正在下载 ${downloadProgress.current}/${downloadProgress.total}...`
                  : '准备中...')
                : (isElectronEnvironment() ? '保存到文件夹' : '打包下载')
              }
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Image Preview Modal */}
      {preview && (
        <ImagePreviewModal
          url={preview.url}
          type={preview.type}
          onClose={() => setPreview(null)}
          onDownload={() => handleDownload(preview.url)}
        />
      )}

      {/* Download Toast */}
      {downloadToast.show && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 ${downloadToast.type === 'loading' ? 'bg-slate-800 text-white' :
          downloadToast.type === 'success' ? 'bg-emerald-600 text-white' :
            'bg-red-600 text-white'
          }`}>
          {downloadToast.type === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
          {downloadToast.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
          <span className="text-sm">{downloadToast.message}</span>
        </div>
      )}
    </div>
  );
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default StepResult;