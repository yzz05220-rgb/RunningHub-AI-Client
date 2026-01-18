
import React, { useState, useEffect } from 'react';
import { Plus, Settings, Search, Grid, LayoutGrid, Cpu, X, Key, Save, Eye, EyeOff } from 'lucide-react';
import { InstalledApp, AppConfig } from '../types';
import { appService } from '../services/appService';
import { getNodeList } from '../services/api';

interface AppLibrarySidebarProps {
    onSelectApp: (app: InstalledApp) => void;
    selectedAppId?: string;
    apiKey: string;
    onApiKeyChange: (key: string) => void;
}

const AppLibrarySidebar: React.FC<AppLibrarySidebarProps> = ({ onSelectApp, selectedAppId, apiKey, onApiKeyChange }) => {
    const [apps, setApps] = useState<InstalledApp[]>([]);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);

    // Import Dialog State
    const [importId, setImportId] = useState('');
    const [importStep, setImportStep] = useState<'INPUT_ID' | 'CONFIG'>('INPUT_ID');
    const [newAppName, setNewAppName] = useState('');
    const [newAppColor, setNewAppColor] = useState('from-brand-500 to-teal-500');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Settings Dialog State
    const [tempApiKey, setTempApiKey] = useState(apiKey);
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        loadApps();
    }, []);

    useEffect(() => {
        setTempApiKey(apiKey);
    }, [apiKey]);

    const loadApps = () => {
        setApps(appService.getAllApps());
    };

    const extractIdFromUrl = (input: string): string => {
        console.log('[extractIdFromUrl] Input:', input);

        // Handle full URL like https://www.runninghub.cn/ai-detail/2010287561301823489
        const urlMatch = input.match(/ai-detail\/(\d+)/);
        if (urlMatch) {
            console.log('[extractIdFromUrl] URL Match found:', urlMatch[1]);
            return urlMatch[1];
        }

        // Handle URL with query params
        const queryMatch = input.match(/webappId=(\d+)/);
        if (queryMatch) {
            console.log('[extractIdFromUrl] Query Match found:', queryMatch[1]);
            return queryMatch[1];
        }

        // Return trimmed input as fallback
        console.log('[extractIdFromUrl] No match, returning trimmed input');
        return input.trim();
    };

    const handleImportCheck = async () => {
        const id = extractIdFromUrl(importId);
        if (!id) return;

        setIsLoading(true);
        setError(null);
        try {
            const key = apiKey || appService.getApiKey();
            if (!key) throw new Error('请先在左下角设置中配置 API Key');

            // Verify ID by trying to fetch nodes
            const nodes = await getNodeList(key, id);
            if (nodes && nodes.length >= 0) {
                setImportId(id); // Use the clean ID
                setImportStep('CONFIG');
                setNewAppName(`App ${id.slice(-4)}`);
            }
        } catch (e: any) {
            setError(e.message || '无法识别该应用，请确保链接或 ID 正确');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportSave = () => {
        if (!newAppName) return;
        appService.addApp({
            webappId: importId,
            name: newAppName,
            coverStyle: newAppColor,
            description: 'Imported App',
        });
        loadApps();
        setShowImportDialog(false);
        setImportId('');
        setImportStep('INPUT_ID');
    };

    const handleSaveSettings = () => {
        onApiKeyChange(tempApiKey);
        setShowSettingsDialog(false);
    };

    const gradients = [
        'from-brand-500 to-teal-500',
        'from-blue-500 to-cyan-500',
        'from-purple-500 to-pink-500',
        'from-orange-500 to-red-500',
        'from-emerald-500 to-green-500',
        'from-slate-700 to-slate-900',
    ];

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 shrink-0">
                <h2 className="text-base font-bold flex items-center gap-2 text-white">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center">
                        <LayoutGrid className="w-4 h-4 text-white" />
                    </div>
                    应用库
                </h2>

                {/* Import Button */}
                <button
                    onClick={() => setShowImportDialog(true)}
                    className="mt-4 w-full py-2 px-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-white transition-all group"
                >
                    <Plus className="w-4 h-4 text-brand-400 group-hover:text-brand-300" />
                    导入新应用
                </button>
            </div>

            {/* App List (Grid) */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {apps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
                        <Grid className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-xs">暂无应用<br />点击上方按钮导入</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {apps.map(app => (
                            <div
                                key={app.id}
                                onClick={() => onSelectApp(app)}
                                className={`
                            group relative aspect-[4/3] rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all border
                            ${selectedAppId === app.id
                                        ? 'bg-white/10 border-brand-500 ring-1 ring-brand-500/50'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}
                        `}
                            >
                                {/* App Icon / Cover */}
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${app.coverStyle} flex items-center justify-center shadow-lg`}>
                                    <Cpu className="w-4 h-4 text-white" />
                                </div>

                                {/* App Info */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-200 truncate group-hover:text-white transition-colors">
                                        {app.name}
                                    </h3>
                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                        ID: {app.webappId.slice(0, 6)}...
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer / Settings */}
            <div className="p-3 border-t border-white/10 shrink-0">
                <button
                    onClick={() => setShowSettingsDialog(true)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors group"
                >
                    <div className={`w-8 h-8 rounded-lg ${apiKey ? 'bg-emerald-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                        <Key className={`w-4 h-4 ${apiKey ? 'text-emerald-400' : 'text-red-400'}`} />
                    </div>
                    <div className="text-left flex-1">
                        <span className="text-xs font-medium block">全局设置</span>
                        <span className={`text-[10px] ${apiKey ? 'text-emerald-500' : 'text-red-400'}`}>
                            {apiKey ? 'API Key 已配置' : '未配置 API Key'}
                        </span>
                    </div>
                    <Settings className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>

            {/* Import Modal */}
            {showImportDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm glass bg-[#1a1d24] rounded-2xl p-5 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-white mb-4">
                            {importStep === 'INPUT_ID' ? '导入新应用' : '自定义配置'}
                        </h3>

                        {importStep === 'INPUT_ID' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1.5">WebApp ID 或 链接</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={importId}
                                            onChange={(e) => setImportId(e.target.value)}
                                            placeholder="ID 或完整链接 (如 runninghub.cn/ai-detail/...)"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 px-3 pl-9 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all"
                                        />
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                    </div>
                                    {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button onClick={() => setShowImportDialog(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">取消</button>
                                    <button
                                        onClick={handleImportCheck}
                                        disabled={!importId || isLoading}
                                        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                        验证并下一步
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1.5">应用名称</label>
                                    <input
                                        type="text"
                                        value={newAppName}
                                        onChange={(e) => setNewAppName(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-brand-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-2">封面颜色</label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {gradients.map(g => (
                                            <div
                                                key={g}
                                                onClick={() => setNewAppColor(g)}
                                                className={`w-8 h-8 rounded-full bg-gradient-to-br ${g} cursor-pointer ring-2 ring-offset-2 ring-offset-[#1a1d24] transition-all ${newAppColor === g ? 'ring-brand-500 scale-110' : 'ring-transparent hover:scale-105'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end pt-4">
                                    <button onClick={() => setImportStep('INPUT_ID')} className="px-4 py-2 text-xs text-slate-400 hover:text-white">上一步</button>
                                    <button
                                        onClick={handleImportSave}
                                        disabled={!newAppName}
                                        className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                                    >
                                        完成导入
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettingsDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm glass bg-[#1a1d24] rounded-2xl p-5 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Settings className="w-5 h-5 text-slate-400" />
                                全局设置
                            </h3>
                            <button
                                onClick={() => setShowSettingsDialog(false)}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-2 flex items-center gap-2">
                                    <Key className="w-3 h-3" />
                                    RunningHub API Key
                                </label>
                                <div className="relative">
                                    <input
                                        type={showApiKey ? 'text' : 'password'}
                                        value={tempApiKey}
                                        onChange={(e) => setTempApiKey(e.target.value)}
                                        placeholder="输入你的 API Key"
                                        className="w-full bg-black/30 border border-white/10 rounded-lg py-3 px-4 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all font-mono"
                                    />
                                    <button
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                                    >
                                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2">
                                    从 <a href="https://www.runninghub.cn/" target="_blank" className="text-brand-400 hover:underline">RunningHub.cn</a> 获取你的 API Key
                                </p>
                            </div>

                            <div className="flex gap-2 justify-end pt-4 border-t border-white/5">
                                <button
                                    onClick={() => setShowSettingsDialog(false)}
                                    className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSaveSettings}
                                    className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <Save className="w-3 h-3" />
                                    保存
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppLibrarySidebar;
