import React, { useState } from 'react';
import { HistoryItem } from '../types';
import { Download, ExternalLink, FileIcon, History, Trash2, Maximize2, X } from 'lucide-react';

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

const StepResult: React.FC<StepResultProps> = ({ history, onClear, isExpanded = false }) => {
  const [preview, setPreview] = useState<{ url: string; type: 'image' | 'video' | 'audio' | 'unknown' } | null>(null);

  const getFileType = (url: string) => {
    if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(url)) return 'image';
    if (/\.(mp4|webm|mov|avi|mkv)$/i.test(url)) return 'video';
    if (/\.(mp3|wav|ogg|flac|aac)$/i.test(url)) return 'audio';
    return 'unknown';
  };

  const handleDownload = async (url: string) => {
    try {
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
        <h2 className="text-base font-bold flex items-center gap-2 text-white">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <History className="w-4 h-4 text-white" />
          </div>
          历史记录
          <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {history.length}
          </span>
        </h2>
        <button
          onClick={onClear}
          title="清空历史"
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
        {history.map((item) => {
          const duration = item.endTime ? item.endTime - item.startTime : 0;

          return (
            <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors">

              {/* Header: App Name & Status (Always Visible) */}
              <div className="px-4 py-3 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${item.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className={`text-sm font-bold text-slate-200 ${isExpanded ? 'break-words' : 'truncate'}`}>
                    {item.appName || '未知应用'}
                  </span>
                </div>
                {/* 失败时的简短提示（未展开时） */}
                {!isExpanded && item.status === 'FAILED' && (
                  <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">失败</span>
                )}
              </div>

              {/* Metadata Section (Expanded Only) */}
              {isExpanded && (
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
                      {item.error}
                    </div>
                  )}
                </div>
              )}

              {/* Images Section - 垂直排列，分割线 */}
              {item.outputs.length > 0 && (
                <div className="flex flex-col">
                  {item.outputs.map((output, idx) => {
                    const type = getFileType(output.fileUrl);

                    return (
                      <div
                        key={idx}
                        className={`relative group/item cursor-pointer ${idx > 0 ? 'border-t border-white/10' : ''}`}
                      >
                        {/* Image Container with Padding and Rounded Corners */}
                        <div className="p-3 bg-slate-900/50">
                          <div className="relative rounded-lg overflow-hidden" onClick={() => setPreview({ url: output.fileUrl, type })}>
                            {/* Image/Video - 完整显示 */}
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

                            {/* Hover Overlay */}
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

                            {/* Type Badge */}
                            {type !== 'image' && (
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

      {/* Full Screen Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <button
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-7xl w-full h-full flex flex-col items-center justify-center">
            {preview.type === 'image' && (
              <img
                src={preview.url}
                alt="Preview"
                className="max-w-full max-h-[90vh] object-contain shadow-2xl"
              />
            )}
            {preview.type === 'video' && (
              <video
                src={preview.url}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] shadow-2xl bg-black"
              />
            )}

            <div className="absolute bottom-8 flex gap-4">
              <button
                onClick={() => handleDownload(preview.url)}
                className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-200 text-slate-900 rounded-full font-bold transition-colors shadow-lg"
              >
                <Download className="w-5 h-5" />
                下载原图
              </button>
              <a
                href={preview.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-colors backdrop-blur-md"
              >
                <ExternalLink className="w-5 h-5" />
                浏览器打开
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepResult;