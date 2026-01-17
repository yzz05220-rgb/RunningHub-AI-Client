const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 基础信息
  platform: process.platform,
  
  // 更新相关
  checkUpdate: () => ipcRenderer.send('check-update'),
  startDownload: () => ipcRenderer.send('start-download'),
  quitAndInstall: () => ipcRenderer.send('quit-and-install'),
  
  // 事件监听
  onUpdateAvailable: (callback) => {
    const subscription = (_event, info) => callback(info);
    ipcRenderer.on('update-available', subscription);
    return () => ipcRenderer.removeListener('update-available', subscription);
  },
  onUpdateNotAvailable: (callback) => {
    const subscription = (_event, info) => callback(info);
    ipcRenderer.on('update-not-available', subscription);
    return () => ipcRenderer.removeListener('update-not-available', subscription);
  },
  onUpdateError: (callback) => {
    const subscription = (_event, message) => callback(message);
    ipcRenderer.on('update-error', subscription);
    return () => ipcRenderer.removeListener('update-error', subscription);
  },
  onDownloadProgress: (callback) => {
    const subscription = (_event, progress) => callback(progress);
    ipcRenderer.on('download-progress', subscription);
    return () => ipcRenderer.removeListener('download-progress', subscription);
  },
  onUpdateDownloaded: (callback) => {
    const subscription = (_event, info) => callback(info);
    ipcRenderer.on('update-downloaded', subscription);
    return () => ipcRenderer.removeListener('update-downloaded', subscription);
  },
  onShowAbout: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('show-about-dialog', subscription);
    return () => ipcRenderer.removeListener('show-about-dialog', subscription);
  }
});
