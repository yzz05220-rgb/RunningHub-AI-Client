import React, { useState, useEffect } from 'react';
import { NodeInfo, HistoryItem } from './types';
import StepEditor from './components/StepEditor';
import StepResult from './components/StepResult';
import TaskFloater from './components/TaskFloater';
import { appService, AppPoolItem } from './services/appService';
import { getNodeList, getFavoriteApps, getWebappDetail } from './services/api';
import { useTaskStore } from './stores/taskStore';
import {
  Loader2, AlertCircle, Settings, ArrowLeft, RefreshCw,
  Zap, Heart, ChevronRight, Key, Save, Eye, EyeOff, X,
  ExternalLink, Maximize2, Minimize2, History, Sparkles,
  Grid3X3, Trash2, Star, Plus, Check, PlusCircle
} from 'lucide-react';
import { PayPalButton } from './components/PayPalButton';
import UpdateNotification from './components/UpdateNotification';
import { AboutDialog } from './components/AboutDialog';
import { isElectronEnvironment } from './utils/envDetection';
import packageInfo from './package.json';
import { APP_CONFIG } from './src/config';

const App: React.FC = () => {
  // --- Global Settings ---
  const [apiKey, setApiKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  // --- App Pool (中间区域) ---
  const [appPool, setAppPool] = useState<AppPoolItem[]>([]);
  const [loadingSyncRH, setLoadingSyncRH] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // --- Local Favorites (左侧本地收藏) ---
  const [localFavorites, setLocalFavorites] = useState<AppPoolItem[]>([]);
  const [activeTab, setActiveTab] = useState<'favorites' | 'recommended'>('favorites');

  // --- Current App / Editor ---
  const [selectedApp, setSelectedApp] = useState<AppPoolItem | null>(null);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [appCovers, setAppCovers] = useState<string[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [nodeError, setNodeError] = useState<string | null>(null);

  // --- UI State ---
  const [showSettings, setShowSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempAccessToken, setTempAccessToken] = useState('');
  const [tempRefreshToken, setTempRefreshToken] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showRefreshToken, setShowRefreshToken] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // --- Add App Modal ---
  const [newAppId, setNewAppId] = useState('');
  const [newAppName, setNewAppName] = useState('');
  const [addingApp, setAddingApp] = useState(false);

  // Task Store
  const { tasks } = useTaskStore();

  // --- Auto Update ---
  // Managed by UpdateNotification component
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // --- Init ---
  useEffect(() => {
    document.documentElement.classList.add('dark');
    setApiKey(appService.getApiKey());
    setAccessToken(appService.getAccessToken());
    setRefreshToken(appService.getRefreshToken());
    refreshData();

    // 监听 Electron 登录回调
    if ((window as any).electronAPI?.onLoginSuccess) {
      const cleanup = (window as any).electronAPI.onLoginSuccess((_event: any, tokens: any) => {
        console.log('Login success, received tokens:', tokens);
        if (tokens.accessToken) {
          setAccessToken(tokens.accessToken);
          setTempAccessToken(tokens.accessToken);
          appService.setAccessToken(tokens.accessToken);
        }
        if (tokens.refreshToken) {
          setRefreshToken(tokens.refreshToken);
          setTempRefreshToken(tokens.refreshToken);
          appService.setRefreshToken(tokens.refreshToken);
        }
        setShowSettings(true); // 确保设置窗口打开以便用户看到
      });
      return () => cleanup();
    }

    // 监听显示关于对话框事件
    if ((window as any).electronAPI?.onShowAbout) {
      const cleanup = (window as any).electronAPI.onShowAbout(() => {
        setShowAboutDialog(true);
      });
      return () => cleanup?.();
    }
  }, []);

  // ... (refreshData, extractIdFromUrl, handleSyncFromRH, handleAddApp, etc. remain the same) ...

  // --- Manual Update Check ---
  const handleManualCheckUpdate = () => {
    if ((window as any).electronAPI?.checkUpdate) {
      console.log('[Manual Update Check] Sending check request...');
      setIsCheckingUpdate(true);
      (window as any).electronAPI.checkUpdate();

      // Listen for result once
      const api = (window as any).electronAPI;
      const offSuccess = api.onUpdateAvailable(() => {
        setIsCheckingUpdate(false);
        setShowAboutDialog(false); // UpdateNotification will show up
        offSuccess();
        offError();
        offNotAvailable();
      });
      const offNotAvailable = api.onUpdateNotAvailable(() => {
        setIsCheckingUpdate(false);
        alert('当前已是最新版本');
        offSuccess();
        offError();
        offNotAvailable();
      });
      const offError = api.onUpdateError((msg: string) => {
        setIsCheckingUpdate(false);
        alert('检查更新失败: ' + msg);
        offSuccess();
        offError();
        offNotAvailable();
      });
    } else {
      alert('手动检查仅在客户端环境可用');
    }
  };



  const refreshData = () => {
    setAppPool(appService.getAppPool());
    setLocalFavorites(appService.getLocalFavorites());
  };

  // --- Extract ID from URL or plain ID ---
  const extractIdFromUrl = (input: string): string => {
    const trimmed = input.trim();

    // 匹配 https://www.runninghub.cn/ai-detail/2012024954291757057
    const urlMatch = trimmed.match(/ai-detail\/(\d+)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    // 匹配查询参数 webappId=xxx
    const queryMatch = trimmed.match(/webappId=(\d+)/);
    if (queryMatch) {
      return queryMatch[1];
    }

    // 直接返回（应该就是 ID）
    return trimmed;
  };

  // --- Sync from RH (去重添加) ---
  const handleSyncFromRH = async () => {
    if (!accessToken) {
      setSyncMessage('请先配置 Access Token');
      return;
    }
    setLoadingSyncRH(true);
    setSyncMessage(null);
    try {
      const rhApps = await getFavoriteApps(accessToken);
      const { added, total } = appService.syncFromRH(rhApps);
      refreshData();
      setSyncMessage(added > 0 ? `新增 ${added} 个，共 ${total} 个` : '无新应用');
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (err: any) {
      setSyncMessage('同步失败: ' + (err.message || '未知错误'));
    } finally {
      setLoadingSyncRH(false);
    }
  };

  // --- Add App Manually ---
  const handleAddApp = async () => {
    // 自动提取 ID（支持完整链接或 ID）
    const extractedId = extractIdFromUrl(newAppId);

    console.log('[handleAddApp] Input:', newAppId);
    console.log('[handleAddApp] Extracted ID:', extractedId);
    console.log('[handleAddApp] API Key:', apiKey ? '已配置' : '未配置');

    if (!extractedId) return;
    if (!apiKey) {
      alert('请先配置 API Key');
      return;
    }

    // 检查是否已存在
    const existing = appService.getAppById(extractedId);
    console.log('检查应用是否存在:', existing);
    if (existing) {
      console.log('应用已存在，无法添加');
      alert('应用已存在于应用池中');
      return;
    }

    setAddingApp(true);
    console.log('开始获取应用详情...');
    try {
      // 调用 API 获取应用详情
      const detail = await getWebappDetail(apiKey, extractedId);
      console.log('获取成功:', detail);

      // 创建带完整信息的 AppPoolItem
      const newApp: AppPoolItem = {
        id: extractedId,
        name: detail.webappName || `应用 ${extractedId.slice(-6)}`,
        intro: '',
        thumbnailUrl: detail.covers?.[0]?.thumbnailUri || detail.covers?.[0]?.url || '',
        owner: { name: '', avatar: '' },
        useCount: parseInt(detail.statisticsInfo?.useCount || '0', 10),
        addedAt: Date.now(),
        isLocalFavorite: false
      };

      // 添加到池子
      const pool = appService.getAppPool();
      pool.unshift(newApp);
      appService.saveAppPool(pool);
      refreshData();

      // 关闭弹窗并清空
      setShowAddModal(false);
      setNewAppId('');
      setNewAppName('');
    } catch (err: any) {
      alert('获取应用详情失败: ' + (err.message || '请检查 WebApp ID 是否正确'));
    } finally {
      setAddingApp(false);
    }
  };

  // --- Delete from pool ---
  const handleDeleteApp = (appId: string) => {
    console.log('Deleting app:', appId);
    appService.removeFromPool(appId);
    refreshData();
    if (selectedApp?.id === appId) setSelectedApp(null);
    setDeleteConfirm(null);
  };

  // --- Toggle local favorite ---
  const handleToggleFavorite = (appId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    appService.toggleLocalFavorite(appId);
    refreshData();
  };

  // --- Select App ---
  const handleSelectApp = async (app: AppPoolItem) => {
    setSelectedApp(app);
    setNodeError(null);
    setLoadingNodes(true);
    setNodes([]);
    setAppCovers([]);
    try {
      if (!apiKey) throw new Error("请先配置 API Key");
      const detail = await getWebappDetail(apiKey, app.id);
      setNodes(detail.nodeInfoList);
      // 提取所有封面图 URL
      const coverUrls = detail.covers?.map(c => c.url || c.thumbnailUri).filter(Boolean) || [];
      setAppCovers(coverUrls);
    } catch (err: any) {
      let msg = err.message || "加载参数失败";
      if (msg.includes("401")) msg = "API Key 无效";
      setNodeError(msg);
    } finally {
      setLoadingNodes(false);
    }
  };

  const handleBack = () => {
    setSelectedApp(null);
    setNodes([]);
    setNodeError(null);
  };

  // --- Settings ---
  const openSettings = () => {
    setTempApiKey(apiKey);
    setTempAccessToken(accessToken);
    setTempRefreshToken(refreshToken);
    setShowSettings(true);
  };



  const saveSettings = () => {
    setApiKey(tempApiKey);
    setAccessToken(tempAccessToken);
    setRefreshToken(tempRefreshToken);
    appService.setApiKey(tempApiKey);
    appService.setAccessToken(tempAccessToken);
    appService.setRefreshToken(tempRefreshToken);
    setShowSettings(false);
  };

  // Map tasks to history
  const historyItems: HistoryItem[] = tasks
    .filter(t => t.status === 'SUCCESS' || t.status === 'FAILED')
    .sort((a, b) => (b.endTime || b.startTime) - (a.endTime || a.startTime))
    .map(t => ({
      id: t.id,
      remoteTaskId: t.remoteTaskId,
      timestamp: t.endTime || t.startTime,
      startTime: t.startTime,
      endTime: t.endTime,
      appName: t.appName,
      appId: t.appId,
      error: t.error,
      outputs: t.result || [],
      status: t.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
    }));

  // --- Render ---
  return (
    <div className="h-screen flex flex-col bg-[#0a0c10] text-slate-100 font-sans overflow-hidden">
      <TaskFloater />

      {/* 更新通知 */}
      <UpdateNotification />

      {/* 关于对话框 */}
      {showAboutDialog && (
        <AboutDialog
          onClose={() => setShowAboutDialog(false)}
          onCheckUpdate={handleManualCheckUpdate}
          isCheckingUpdate={isCheckingUpdate}
        />
      )}

      {/* ===== HEADER ===== */}
      <header className="h-14 bg-[#12151a] border-b border-white/5 flex items-center justify-between px-5 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-base font-bold text-white">RunningHub AI</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${apiKey ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${apiKey ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
            {apiKey ? 'API 已连接' : '未配置 API Key'}
          </div>
          <button onClick={openSettings} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ===== MAIN 3-COLUMN LAYOUT ===== */}
      <div className="flex-1 flex overflow-hidden">

        {/* ===== LEFT SIDEBAR - 本地收藏 & 推荐 ===== */}
        <aside className="w-56 bg-[#0f1116] border-r border-white/5 flex flex-col shrink-0">
          <div className="p-3 border-b border-white/5">
            <div className="flex gap-1 p-0.5 bg-black/30 rounded-lg">
              <button
                onClick={() => setActiveTab('favorites')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${activeTab === 'favorites' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                <Star className="w-3.5 h-3.5" />
                我的收藏
              </button>
              <button
                onClick={() => setActiveTab('recommended')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${activeTab === 'recommended' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                推荐
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {activeTab === 'favorites' ? (
              localFavorites.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Star className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                  <p className="text-sm text-slate-500 leading-relaxed">
                    点击应用卡片上的<br />
                    <span className="text-yellow-400">★ 按钮</span> 收藏到这里
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {localFavorites.map(app => (
                    <button
                      key={app.id}
                      onClick={() => handleSelectApp(app)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-all group ${selectedApp?.id === app.id
                        ? 'bg-brand-500/10 border border-brand-500/30'
                        : 'hover:bg-white/5 border border-transparent'
                        }`}
                    >
                      {app.thumbnailUrl ? (
                        <img src={app.thumbnailUrl} className="w-9 h-9 rounded-md object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shrink-0">
                          <Zap className="w-4 h-4 text-slate-500" />
                        </div>
                      )}
                      <p className={`text-sm font-medium truncate flex-1 ${selectedApp?.id === app.id ? 'text-brand-400' : 'text-slate-300'}`}>
                        {app.name}
                      </p>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-12 px-4">
                <Sparkles className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                <p className="text-sm text-slate-500">暂无推荐</p>
              </div>
            )}
          </div>
        </aside>

        {/* ===== CENTER - 应用池 / 编辑器 ===== */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0a0c10]">
          {selectedApp ? (
            // === Editor View ===
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 bg-[#0f1116] flex items-center gap-3 shrink-0">
                <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                {selectedApp.thumbnailUrl && (
                  <img src={selectedApp.thumbnailUrl} className="w-10 h-10 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <h1 className="text-base font-bold text-white truncate">{selectedApp.name}</h1>
                  <p className="text-xs text-slate-500 font-mono">ID: {selectedApp.id}</p>
                </div>
                <button
                  onClick={(e) => handleToggleFavorite(selectedApp.id, e)}
                  className={`p-2.5 rounded-lg transition-colors ${selectedApp.isLocalFavorite ? 'bg-yellow-500/10 text-yellow-400' : 'bg-white/5 text-slate-500 hover:text-yellow-400'}`}
                  title={selectedApp.isLocalFavorite ? '取消收藏' : '收藏'}
                >
                  <Star className={`w-5 h-5 ${selectedApp.isLocalFavorite ? 'fill-current' : ''}`} />
                </button>
                <a
                  href={`https://www.runninghub.cn/ai-detail/${selectedApp.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  <ExternalLink className="w-4 h-4" />
                  官网查看
                </a>
              </div>

              <div className="flex-1 overflow-hidden">
                {loadingNodes ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
                    <p className="text-sm text-slate-500">加载参数...</p>
                  </div>
                ) : nodeError ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-base text-white font-medium mb-2">加载失败</p>
                    <p className="text-sm text-slate-500 mb-4">{nodeError}</p>
                    <button onClick={() => handleSelectApp(selectedApp)} className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white">
                      重试
                    </button>
                  </div>
                ) : (
                  <StepEditor
                    nodes={nodes}
                    apiKey={apiKey}
                    isConnected={!!apiKey}
                    onBack={handleBack}
                    covers={appCovers}
                    currentApp={{
                      id: selectedApp.id,
                      webappId: selectedApp.id,
                      name: selectedApp.name,
                      coverStyle: 'from-brand-500 to-teal-500',
                      description: selectedApp.intro,
                      createdAt: Date.now()
                    }}
                  />
                )}
              </div>
            </div>
          ) : (
            // === App Pool (Grid) ===
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Pool Header with Add Button */}
              <div className="px-5 py-3 border-b border-white/5 bg-[#0f1116] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <Grid3X3 className="w-5 h-5 text-brand-500" />
                  <h1 className="text-base font-bold text-white">应用池</h1>
                  <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded">{appPool.length} 个</span>
                </div>
                <div className="flex items-center gap-2">
                  {syncMessage && (
                    <span className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded">{syncMessage}</span>
                  )}
                  {/* 手动添加应用按钮 */}
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    手动添加
                  </button>
                  <button
                    onClick={handleSyncFromRH}
                    disabled={loadingSyncRH || !accessToken}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-lg text-xs font-medium disabled:opacity-40 transition-colors"
                    title={!accessToken ? '需要配置 Access Token' : '从 RunningHub 同步收藏'}
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingSyncRH ? 'animate-spin' : ''}`} />
                    从RH同步
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                {appPool.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center mb-5">
                      <Plus className="w-10 h-10 text-slate-600" />
                    </div>
                    <h2 className="text-lg text-white font-bold mb-3">应用池为空</h2>
                    <p className="text-sm text-slate-500 text-center max-w-sm mb-5">
                      点击"手动添加"输入 WebApp ID 添加应用<br />
                      或配置 Access Token 后点击"从RH同步"
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => setShowAddModal(true)} className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 rounded-lg text-sm text-white font-medium flex items-center gap-2">
                        <PlusCircle className="w-4 h-4" />
                        手动添加应用
                      </button>
                      <button onClick={openSettings} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white">
                        配置设置
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {appPool.map(app => (
                      <div
                        key={app.id}
                        onClick={() => handleSelectApp(app)}
                        className="group relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1"
                      >
                        <div className="aspect-[4/3] bg-slate-900 overflow-hidden relative">
                          {app.thumbnailUrl ? (
                            <img src={app.thumbnailUrl} alt={app.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                              <Zap className="w-12 h-12 text-slate-700" />
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="absolute top-2.5 right-2.5 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleFavorite(app.id, e); }}
                              className={`p-2.5 rounded-xl backdrop-blur-xl border transition-all duration-200 ${app.isLocalFavorite ? 'bg-yellow-500/90 border-yellow-400/50 text-white shadow-lg shadow-yellow-500/20' : 'bg-black/60 border-white/10 text-slate-300 hover:text-yellow-400 hover:border-yellow-400/30'}`}
                              title={app.isLocalFavorite ? '取消收藏' : '收藏到左侧'}
                            >
                              <Star className={`w-4 h-4 ${app.isLocalFavorite ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(app.id); }}
                              className="p-2.5 rounded-xl bg-black/60 border border-white/10 text-slate-300 hover:text-red-400 hover:border-red-400/30 backdrop-blur-xl transition-all duration-200"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Favorite badge */}
                          {app.isLocalFavorite && (
                            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-lg shadow-yellow-500/30">
                              <Star className="w-3 h-3 fill-current" />
                              已收藏
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <h3 className="text-sm font-semibold text-white truncate mb-1.5 group-hover:text-emerald-400 transition-colors duration-200">{app.name}</h3>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-500 font-medium">{app.useCount || 0} 次使用</span>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all duration-200" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* ===== RIGHT SIDEBAR - 历史结果 ===== */}
        <aside className={`bg-[#0f1116] border-l border-white/5 flex flex-col shrink-0 transition-all duration-300 ${historyExpanded ? 'w-[420px]' : 'w-72'}`}>
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-300">历史记录</span>
              {historyItems.length > 0 && (
                <span className="px-2 py-0.5 bg-brand-500/10 text-brand-400 text-xs rounded-full">{historyItems.length}</span>
              )}
            </div>
            <button
              onClick={() => setHistoryExpanded(!historyExpanded)}
              className="p-1.5 hover:bg-white/5 rounded text-slate-500 hover:text-white transition-colors"
            >
              {historyExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <StepResult history={historyItems} onClear={() => useTaskStore.getState().clearHistory()} isExpanded={historyExpanded} />
          </div>
        </aside>
      </div>

      {/* ===== DELETE CONFIRM MODAL ===== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#14171d] rounded-xl p-5 border border-white/10 shadow-2xl max-w-sm w-full">
            <h3 className="text-base font-bold text-white mb-3">确认删除</h3>
            <p className="text-sm text-slate-400 mb-5">确定要从应用池中删除此应用吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteApp(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm text-white font-medium"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD APP MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl shadow-emerald-500/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <PlusCircle className="w-5 h-5 text-white" />
                </div>
                手动添加应用
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  WebApp ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newAppId}
                  onChange={(e) => setNewAppId(e.target.value)}
                  placeholder="例如: 2010287561301823489"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 font-mono transition-all"
                />
                <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                  从应用页面 URL 中获取，如 /ai-detail/<span className="text-emerald-400">2010287561301823489</span>
                  <br />
                  <span className="text-slate-600">输入后会自动获取应用名称和封面</span>
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-3.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                  取消
                </button>
                <button
                  onClick={handleAddApp}
                  disabled={!newAppId.trim() || addingApp || !apiKey}
                  className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
                  title={!apiKey ? '需要先配置 API Key' : ''}
                >
                  {addingApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {addingApp ? '获取中...' : '获取并添加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SETTINGS MODAL ===== */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#14171d] rounded-2xl p-5 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-400" />
                设置
              </h2>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="flex items-center gap-1.5 text-sm text-slate-400 mb-2">
                  <Key className="w-4 h-4" />
                  API Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="用于调用 AI 应用"
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500/50 font-mono"
                  />
                  <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-3 text-slate-500 hover:text-slate-300">
                    {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>



              <div>
                <label className="flex items-center gap-1.5 text-sm text-slate-400 mb-2">
                  <Heart className="w-4 h-4" />
                  Access Token <span className="text-slate-600">(同步收藏用)</span>
                </label>
                <div className="relative">
                  <input
                    type={showAccessToken ? 'text' : 'password'}
                    value={tempAccessToken}
                    onChange={(e) => setTempAccessToken(e.target.value)}
                    placeholder="从浏览器 localStorage 获取"
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500/50 font-mono"
                  />
                  <button onClick={() => setShowAccessToken(!showAccessToken)} className="absolute right-3 top-3 text-slate-500 hover:text-slate-300">
                    {showAccessToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  获取方式：F12 → Application → Local Storage → Rh-Accesstoken
                </p>
              </div>



              {/* PayPal Payment (Web Only) */}
              <PayPalButton className="mt-4" />

              <div className="flex gap-3 pt-3 border-t border-white/5">
                <button onClick={() => setShowSettings(false)} className="flex-1 py-3 text-sm text-slate-400 hover:text-white">
                  取消
                </button>
                <button onClick={saveSettings} className="flex-1 py-3 bg-brand-500 hover:bg-brand-400 text-white font-medium rounded-lg flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" />
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Notification */}

    </div>
  );
};

export default App;
