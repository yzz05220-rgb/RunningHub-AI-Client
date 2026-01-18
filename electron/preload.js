const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // 基础信息
    platform: process.platform,

    // --- 自动更新 (Auto Updater) ---
    checkUpdate: () => ipcRenderer.send('check-update'),
    startDownload: () => ipcRenderer.send('start-download'),
    quitAndInstall: () => ipcRenderer.send('quit-and-install'),

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
    onUpdateDownloadProgress: (callback) => {
        // Listens to 'update-download-progress' from Main
        const subscription = (_event, progress) => callback(progress);
        ipcRenderer.on('update-download-progress', subscription);
        return () => ipcRenderer.removeListener('update-download-progress', subscription);
    },
    onUpdateDownloaded: (callback) => {
        const subscription = (_event, info) => callback(info);
        ipcRenderer.on('update-downloaded', subscription);
        return () => ipcRenderer.removeListener('update-downloaded', subscription);
    },

    // --- 批量下载 (Batch Download) ---
    selectDownloadFolder: () => ipcRenderer.invoke('select-download-folder'),
    downloadFiles: (files, options) => ipcRenderer.invoke('download-files', files, options),
    downloadFile: (url, targetDir, fileName) => ipcRenderer.invoke('download-file', url, targetDir, fileName),

    // --- 自动保存 (任务完成后) ---
    autoSaveFiles: (files, targetDir) => ipcRenderer.invoke('auto-save-files', files, targetDir),

    onDownloadProgress: (callback) => {
        // Maps to 'batch-download-progress' from Main to support Legacy `StepResult.tsx`
        const subscription = (_event, data) => callback(_event, data);
        ipcRenderer.on('batch-download-progress', subscription);
        return () => {
            ipcRenderer.removeListener('batch-download-progress', subscription);
        }
    },

    // --- 图片解码 (SS_tools) ---
    decodeImage: (imageDataArray, fileName) => ipcRenderer.invoke('decode-image', imageDataArray, fileName),

    // --- 登录 (Legacy) ---
    openLogin: () => ipcRenderer.invoke('open-login'),
    onLoginSuccess: (callback) => {
        const subscription = (_event, tokens) => callback(_event, tokens);
        ipcRenderer.on('login-success', subscription);
        return () => {
            ipcRenderer.removeListener('login-success', subscription);
        }
    },

    // --- 其他 ---
    onShowAbout: (callback) => {
        const subscription = () => callback();
        ipcRenderer.on('show-about-dialog', subscription);
        return () => ipcRenderer.removeListener('show-about-dialog', subscription);
    }
});
