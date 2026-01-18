import { useEffect, useState } from 'react';
import { X, Download, RefreshCw } from 'lucide-react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdateInfo {
  version: string;
  date: string;
  body?: string;
}

export function TauriUpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const update = await check();
      if (update?.available) {
        setUpdateAvailable(true);
        setUpdateInfo({
          version: update.version,
          date: update.date || new Date().toISOString(),
          body: update.body,
        });
      }
    } catch (error) {
      console.error('检查更新失败:', error);
    }
  };

  const handleDownload = async () => {
    if (!updateInfo) return;
    
    setDownloading(true);
    try {
      const update = await check();
      if (update?.available) {
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              setDownloadProgress(0);
              break;
            case 'Progress':
              setDownloadProgress(event.data.chunkLength / event.data.contentLength! * 100);
              break;
            case 'Finished':
              setDownloadProgress(100);
              setUpdateReady(true);
              break;
          }
        });
      }
    } catch (error) {
      console.error('下载更新失败:', error);
      setDownloading(false);
    }
  };

  const handleInstall = async () => {
    await relaunch();
  };

  const handleIgnore = () => {
    const ignoredVersions = JSON.parse(localStorage.getItem('ignoredVersions') || '[]');
    if (updateInfo && !ignoredVersions.includes(updateInfo.version)) {
      ignoredVersions.push(updateInfo.version);
      localStorage.setItem('ignoredVersions', JSON.stringify(ignoredVersions));
    }
    setUpdateAvailable(false);
  };

  if (!updateAvailable) return null;

  // 检查是否已忽略此版本
  const ignoredVersions = JSON.parse(localStorage.getItem('ignoredVersions') || '[]');
  if (updateInfo && ignoredVersions.includes(updateInfo.version)) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-[#1a1d24] border border-white/10 rounded-xl shadow-2xl p-5 z-50 animate-slide-up">
      <button
        onClick={handleIgnore}
        className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors"
      >
        <X size={18} />
      </button>

      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center flex-shrink-0">
          <RefreshCw className="text-brand-500" size={20} />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-medium text-base mb-1">发现新版本</h3>
          <p className="text-white/60 text-sm">
            v{updateInfo?.version} 已发布
          </p>
        </div>
      </div>

      {updateInfo?.body && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg">
          <p className="text-white/70 text-sm whitespace-pre-wrap line-clamp-3">
            {updateInfo.body}
          </p>
        </div>
      )}

      {downloading && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-white/60 mb-2">
            <span>下载进度</span>
            <span>{Math.round(downloadProgress)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!updateReady ? (
          <>
            <button
              onClick={handleIgnore}
              className="flex-1 px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              忽略此版本
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {downloading ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  下载中...
                </>
              ) : (
                <>
                  <Download size={16} />
                  立即下载
                </>
              )}
            </button>
          </>
        ) : (
          <button
            onClick={handleInstall}
            className="w-full px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            重启并安装
          </button>
        )}
      </div>
    </div>
  );
}
