import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

interface VersionInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

const UpdateNotification: React.FC = () => {
  const [availableUpdate, setAvailableUpdate] = useState<VersionInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [status, setStatus] = useState<'idle' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!(window as any).electronAPI) return;

    const api = (window as any).electronAPI;

    const unbindAvailable = api.onUpdateAvailable((info: VersionInfo) => {
      // 检查是否忽略了该版本
      const ignoredVersion = localStorage.getItem('rh_ignored_version');
      if (ignoredVersion === info.version) return;

      setAvailableUpdate(info);
      setIsVisible(true);
      setStatus('idle');
    });

    const unbindProgress = api.onDownloadProgress((p: DownloadProgress) => {
      setProgress(p);
      setStatus('downloading');
    });

    const unbindDownloaded = () => {
      setStatus('downloaded');
    };
    api.onUpdateDownloaded(unbindDownloaded);

    const unbindError = api.onUpdateError((msg: string) => {
      setError(msg);
      setStatus('error');
    });

    return () => {
      unbindAvailable();
      unbindProgress();
      unbindError();
    };
  }, []);

  const handleDownload = () => {
    (window as any).electronAPI.startDownload();
    setStatus('downloading');
  };

  const handleInstall = () => {
    (window as any).electronAPI.quitAndInstall();
  };

  const handleIgnore = () => {
    if (availableUpdate) {
      localStorage.setItem('rh_ignored_version', availableUpdate.version);
    }
    setIsVisible(false);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible || !availableUpdate) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-80 bg-[#1c2128] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-300">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-brand-500/20 to-purple-500/20 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">发现新版本</h3>
            <p className="text-[10px] text-slate-400">v{availableUpdate.version}</p>
          </div>
        </div>
        <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {status === 'idle' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              RunningHub AI 有新版本可用，建议立即更新以获得最佳体验。
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 py-2 bg-brand-500 hover:bg-brand-400 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                立即下载
              </button>
              <button
                onClick={handleIgnore}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 text-xs rounded-lg transition-colors"
              >
                忽略
              </button>
            </div>
          </div>
        )}

        {status === 'downloading' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                正在下载...
              </span>
              <span className="text-brand-400 font-mono">{Math.round(progress?.percent || 0)}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-500 transition-all duration-300" 
                style={{ width: `${progress?.percent || 0}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 text-center">
              {(progress?.bytesPerSecond || 0 / 1024 / 1024).toFixed(2)} MB/s
            </p>
          </div>
        )}

        {status === 'downloaded' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium">下载完成</span>
            </div>
            <p className="text-xs text-slate-300">新版本已准备就绪，重启应用即可完成安装。</p>
            <button
              onClick={handleInstall}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              重启并安装
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-medium">更新失败</span>
            </div>
            <p className="text-[10px] text-slate-400 line-clamp-2">{error}</p>
            <button
              onClick={handleDownload}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-lg transition-colors"
            >
              重试
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateNotification;
