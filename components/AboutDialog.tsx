import React, { useState, useEffect } from 'react';
import { X, Zap, Github, Globe, ShieldCheck, RefreshCw, Check } from 'lucide-react';
import packageInfo from '../package.json';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutDialog: React.FC<AboutDialogProps> = ({ isOpen, onClose }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<'idle' | 'latest' | 'error'>('idle');

  useEffect(() => {
    if (!(window as any).electronAPI) return;
    
    const api = (window as any).electronAPI;
    const unbindNotAvailable = api.onUpdateNotAvailable(() => {
      setIsChecking(false);
      setCheckResult('latest');
      setTimeout(() => setCheckResult('idle'), 3000);
    });

    const unbindError = api.onUpdateError(() => {
      setIsChecking(false);
      setCheckResult('error');
      setTimeout(() => setCheckResult('idle'), 3000);
    });

    return () => {
      unbindNotAvailable();
      unbindError();
    };
  }, []);

  if (!isOpen) return null;

  const handleCheckUpdate = () => {
    if (isChecking) return;
    setIsChecking(true);
    setCheckResult('idle');
    if ((window as any).electronAPI) {
      (window as any).electronAPI.checkUpdate();
    } else {
      // Web 环境模拟
      setTimeout(() => {
        setIsChecking(false);
        setCheckResult('latest');
        setTimeout(() => setCheckResult('idle'), 3000);
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#14171d] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-br from-brand-600 to-purple-700 flex items-center justify-center">
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/40 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-2">
              <Zap className="w-10 h-10 text-brand-500" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">RunningHub AI</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">当前版本</p>
            <p className="text-xl font-mono font-bold text-white">v{packageInfo.version}</p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleCheckUpdate}
              disabled={isChecking}
              className={`w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                checkResult === 'latest' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-white border border-white/5'
              }`}
            >
              {isChecking ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : checkResult === 'latest' ? (
                <Check className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isChecking ? '正在检查...' : checkResult === 'latest' ? '已是最新版本' : '检查更新'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <a href="https://github.com/yzz05220-rgb/RunningHub-AI-Client" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 group">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <Github className="w-5 h-5 text-slate-400 group-hover:text-white" />
              </div>
              <span className="text-[10px] text-slate-500">GitHub</span>
            </a>
            <a href="https://runninghub.ai" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 group">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <Globe className="w-5 h-5 text-slate-400 group-hover:text-white" />
              </div>
              <span className="text-[10px] text-slate-500">官网</span>
            </a>
            <div className="flex flex-col items-center gap-1.5 group">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-[10px] text-slate-500">已授权</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black/20 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-600">
            © 2026 RunningHub AI Team. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutDialog;
