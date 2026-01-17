import React from 'react';
import { X, Download, Sparkles, Zap } from 'lucide-react';
import packageInfo from '../package.json';

interface AboutDialogProps {
    onClose: () => void;
    onCheckUpdate: () => void;
    isCheckingUpdate?: boolean;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ onClose, onCheckUpdate, isCheckingUpdate = false }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gradient-to-br from-[#14171d] to-[#0f1116] rounded-2xl p-6 border border-white/10 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Logo & Title */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <Zap className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">RunningHub AI</h2>
                        <p className="text-sm text-slate-400 font-mono">版本 {packageInfo.version}</p>
                    </div>
                </div>

                {/* Info */}
                <div className="space-y-2 mb-6 text-sm px-1">
                    <p className="text-slate-300">AI 应用快速调用与批量处理工具</p>
                    <p className="text-slate-500 text-xs">© 2026 RunningHub. All rights reserved.</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-all"
                    >
                        关闭
                    </button>
                    <button
                        onClick={onCheckUpdate}
                        disabled={isCheckingUpdate}
                        className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:from-slate-600 disabled:to-slate-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
                    >
                        {isCheckingUpdate ? (
                            <>
                                <Sparkles className="w-4 h-4 animate-spin" />
                                检查中...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                检查更新
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
