const { app, BrowserWindow, ipcMain, Menu, session, dialog, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const https = require('https');
const http = require('http');

let mainWindow;
let loginWindow = null;

// 配置自动更新
autoUpdater.autoDownload = false; // 建议手动触发下载，体验更好
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1000,
        minHeight: 600,
        titleBarStyle: 'hiddenInset', // macOS 风格
        backgroundColor: '#14171d',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, '../public/rh.png'),
        show: false, // 准备好再显示
    });

    const startUrl = isDev
        ? 'http://localhost:5173'
        : `file://${path.join(__dirname, '../dist/index.html')}`;

    mainWindow.loadURL(startUrl);

    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            require('electron').shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    createMenu();
}

function createMenu() {
    const template = [
        {
            label: '编辑',
            submenu: [
                { role: 'undo', label: '撤销' },
                { role: 'redo', label: '重做' },
                { type: 'separator' },
                { role: 'cut', label: '剪切' },
                { role: 'copy', label: '复制' },
                { role: 'paste', label: '粘贴' },
            ]
        },
        {
            label: '视图',
            submenu: [
                { role: 'reload', label: '刷新' },
                { role: 'toggleDevTools', label: '开发者工具' },
                { type: 'separator' },
                { role: 'resetZoom', label: '重置缩放' },
                { role: 'zoomIn', label: '放大' },
                { role: 'zoomOut', label: '缩小' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: '全屏' }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于 RunningHub AI',
                    click: () => {
                        if (mainWindow) mainWindow.webContents.send('show-about-dialog');
                    }
                },
                {
                    label: '检查更新',
                    click: () => {
                        autoUpdater.checkForUpdates();
                    }
                },
                { type: 'separator' },
                {
                    label: '查看日志文件',
                    click: () => {
                        const logPath = autoUpdater.logger.transports.file.getFile().path;
                        shell.showItemInFolder(logPath);
                    }
                },
                { type: 'separator' },
                {
                    label: '访问官网',
                    click: async () => {
                        await shell.openExternal('https://runninghub.ai');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.on('ready', () => {
    createWindow();
    // 启动时自动检查更新 (仅生产环境)
    if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// --- 自动更新事件处理 ---

autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('update-not-available', info);
});

autoUpdater.on('error', (err) => {
    if (mainWindow) mainWindow.webContents.send('update-error', err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
    // Send as update-download-progress to avoid conflict with batch download
    if (mainWindow) mainWindow.webContents.send('update-download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
});

// --- IPC 通信处理 ---

ipcMain.on('start-download', () => {
    autoUpdater.downloadUpdate();
});

ipcMain.on('quit-and-install', () => {
    autoUpdater.quitAndInstall();
});

ipcMain.on('check-update', () => {
    autoUpdater.checkForUpdates();
});

// --- Login Handler (Legacy/Compatibility) ---
ipcMain.handle('open-login', async () => {
    if (loginWindow) {
        loginWindow.focus();
        return;
    }

    loginWindow = new BrowserWindow({
        width: 500,
        height: 700,
        parent: mainWindow,
        modal: true,
        show: false,
        title: '登录 RunningHub',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    loginWindow.once('ready-to-show', () => {
        loginWindow.show();
    });

    const checkAndSendTokens = async () => {
        try {
            const cookies = await session.defaultSession.cookies.get({ domain: 'runninghub.cn' });
            let accessToken = '';
            let refreshToken = '';
            cookies.forEach(cookie => {
                if (cookie.name === 'Rh-Accesstoken') accessToken = cookie.value;
                if (cookie.name === 'Rh-Refreshtoken') refreshToken = cookie.value;
            });

            if (accessToken && refreshToken) {
                if (mainWindow) {
                    mainWindow.webContents.send('login-success', { accessToken, refreshToken });
                }
                if (loginWindow) {
                    loginWindow.close();
                    loginWindow = null;
                }
            }
        } catch (error) {
            console.error('Check tokens error:', error);
        }
    };

    session.defaultSession.cookies.on('changed', (event, cookie, cause, removed) => {
        if (cookie.domain.includes('runninghub.cn')) {
            if (cookie.name === 'Rh-Accesstoken' || cookie.name === 'Rh-Refreshtoken') {
                checkAndSendTokens();
            }
        }
    });

    // Poll for localstorage as fallback
    const pollInterval = setInterval(async () => {
        if (!loginWindow || loginWindow.isDestroyed()) {
            clearInterval(pollInterval);
            return;
        }
        try {
            const tokens = await loginWindow.webContents.executeJavaScript(`
                (function() {
                    return {
                        accessToken: localStorage.getItem('Rh-Accesstoken'),
                        refreshToken: localStorage.getItem('Rh-Refreshtoken')
                    };
                })();
            `);

            if (tokens.accessToken && tokens.refreshToken) {
                mainWindow.webContents.send('login-success', tokens);
                clearInterval(pollInterval);
                loginWindow.close();
                loginWindow = null;
            }
        } catch (e) { }
    }, 1000);

    loginWindow.loadURL('https://www.runninghub.cn/login');

    loginWindow.on('closed', () => {
        loginWindow = null;
        clearInterval(pollInterval);
    });
});

// --- Batch Download Handler ---
ipcMain.handle('download-files', async (event, files) => {
    if (!mainWindow) return { success: false, message: 'Window not found' };
    const archiver = require('archiver');
    const os = require('os');

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const defaultName = `RunningHub_Batch_${timestamp}.zip`;

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: '保存批量下载',
        defaultPath: path.join(app.getPath('downloads'), defaultName),
        filters: [{ name: 'ZIP 压缩包', extensions: ['zip'] }]
    });

    if (canceled || !filePath) return { success: false, message: 'User canceled' };

    const tempDir = path.join(os.tmpdir(), `rh_batch_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const downloadFile = (url, fileName) => {
        return new Promise((resolve, reject) => {
            const destPath = path.join(tempDir, fileName);
            const fileStream = fs.createWriteStream(destPath);
            const protocol = url.startsWith('https') ? https : http;
            const request = protocol.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    downloadFile(response.headers.location, fileName).then(resolve).catch(reject);
                    return;
                }
                if (response.statusCode !== 200) {
                    fs.unlink(destPath, () => { });
                    reject(new Error(`Status Code: ${response.statusCode}`));
                    return;
                }
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close(() => resolve(destPath));
                });
                fileStream.on('error', (err) => {
                    fs.unlink(destPath, () => { });
                    reject(err);
                });
            });
            request.on('error', (err) => {
                fs.unlink(destPath, () => { });
                reject(err);
            });
        });
    };

    const sendProgress = (current, total) => {
        // Use 'batch-download-progress' to distinguish from auto-updater
        event.sender.send('batch-download-progress', { current, total });
    };

    const downloadResults = await Promise.allSettled(
        files.map(async (file, index) => {
            try {
                const safeName = file.name.replace(/[<>:"/\\|?*]+/g, '_');
                await downloadFile(file.url, safeName);
                sendProgress(index + 1, files.length);
                return { success: true, name: file.name };
            } catch (error) {
                console.error(`Failed to download ${file.name}:`, error);
                sendProgress(index + 1, files.length);
                return { success: false, name: file.name, error: error.message };
            }
        })
    );

    const successCount = downloadResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failCount = downloadResults.length - successCount;

    try {
        const output = fs.createWriteStream(filePath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        await new Promise((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);
            archive.directory(tempDir, false);
            archive.finalize();
        });
        fs.rmSync(tempDir, { recursive: true, force: true });
        return {
            success: true,
            message: `已打包为 ZIP：成功 ${successCount} 个，失败 ${failCount} 个`,
            stats: { success: successCount, fail: failCount }
        };
    } catch (err) {
        console.error('ZIP creation failed:', err);
        fs.rmSync(tempDir, { recursive: true, force: true });
        return {
            success: false,
            message: `ZIP 创建失败: ${err.message}`,
            stats: { success: successCount, fail: failCount }
        };
    }
});
