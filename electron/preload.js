const { contextBridge, ipcRenderer } = require('electron')

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('electronAPI', {
    // 平台信息
    platform: process.platform,
    // 打开登录窗口
    openLogin: () => ipcRenderer.invoke('open-login'),
    // 监听登录成功
    onLoginSuccess: (callback) => {
        const subscription = (_event, tokens) => callback(_event, tokens);
        ipcRenderer.on('login-success', subscription);
        return () => {
            ipcRenderer.removeListener('login-success', subscription);
        }
    },
    // 批量下载文件
    downloadFiles: (files) => ipcRenderer.invoke('download-files', files),
    // 监听下载进度
    onDownloadProgress: (callback) => {
        const subscription = (_event, data) => callback(_event, data);
        ipcRenderer.on('download-progress', subscription);
        return () => {
            ipcRenderer.removeListener('download-progress', subscription);
        }
    },
    // 监听显示关于对话框
    onShowAbout: (callback) => {
        const subscription = () => callback();
        ipcRenderer.on('show-about-dialog', subscription);
        return () => {
            ipcRenderer.removeListener('show-about-dialog', subscription);
        };
    }
})
