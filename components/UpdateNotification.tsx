import React from 'react';
import { Download, X, Calendar, Sparkles } from 'lucide-react';
import { VersionInfo } from '../services/updateService';

interface UpdateNotificationProps {
    versionInfo: VersionInfo;
    onDownload: () => void;
    onDismiss: () => void;
    onIgnore: () => void;
}

/**
 * 更新通知组件
 * 显示可用更新、Changelog 和操作按钮
 */
export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
    versionInfo,
    onDownload,
    onDismiss,
    onIgnore,
}) => {
    return (
        <div className="fixed top-4 right-4 z-50 w-96 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-2xl shadow-blue-500/50 border border-blue-400/30 overflow-hidden animate-slide-in">
            {/* Header */}
            <div className="relative p-4 bg-gradient-to-r from-white/10 to-transparent">
                <button
                    onClick={onDismiss}
                    className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                    <h3 className="text-lg font-bold">有新版本可用！</h3>
                </div>

                <div className="flex items-center gap-2 text-sm text-blue-100">
                    <span className="font-semibold">v{versionInfo.version}</span>
                    <span className="text-blue-200">•</span>
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{versionInfo.releaseDate}</span>
                    </div>
                </div>
            </div>

            {/* Changelog */}
            <div className="px-4 py-3 bg-black/20 max-h-48 overflow-y-auto">
                <h4 className="text-sm font-semibold mb-2 text-blue-100">更新内容</h4>
                <div className="text-sm text-white/90 whitespace-pre-line leading-relaxed">
                    {versionInfo.changelog}
                </div>
            </div>

            {/* Actions */}
            <div className="p-4 flex flex-col gap-2">
                <div className="flex gap-3">
                    <button
                        onClick={onDismiss}
                        className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-all"
                    >
                        稍后提醒
                    </button>
                    <button
                        onClick={onDownload}
                        className="flex-1 py-2.5 bg-white text-blue-600 hover:bg-blue-50 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-105"
                    >
                        <Download className="w-4 h-4" />
                        立即更新
                    </button>
                </div>
                <button
                    onClick={onIgnore}
                    className="w-full py-2 bg-black/20 hover:bg-black/30 rounded-lg text-sm text-white/70 hover:text-white transition-all"
                >
                    忽略此版本
                </button>
            </div>
        </div>
    );
};

// Add animation styles (if not already in global CSS)
const styles = `
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}`;
