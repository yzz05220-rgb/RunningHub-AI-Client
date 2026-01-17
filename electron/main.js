const { app, BrowserWindow, shell, ipcMain, session, dialog, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const https = require('https')
const http = require('http')

// 设置app名称
app.setName('RunningHub AI')

// 禁用硬件加速，防止在某些配置较低或驱动缺失的机器上出现黑屏/崩溃
app.disableHardwareAcceleration();

const logPath = path.join(app.getPath('userData'), 'crash.log');
const log = (msg) => {
    const time = new Date().toISOString();
    fs.appendFileSync(logPath, `[${time}] ${msg}\n`);
};

log('App Starting...');

process.on('uncaughtException', (error) => {
    log(`[CRITICAL] Uncaught Exception: ${error.stack}`);
});

process.on('unhandledRejection', (reason) => {
    log(`[CRITICAL] Unhandled Rejection: ${reason}`);
});

let mainWindow = null
let loginWindow = null

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 600,
        title: 'RunningHub AI',
        icon: path.join(__dirname, '../public/rh.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        show: false,
        backgroundColor: '#0a0c10',
    })

    // 窗口准备好后显示
    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    // 打开外部链接使用默认浏览器
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url)
        }
        return { action: 'deny' }
    })

    mainWindow.webContents.on('render-process-gone', (event, details) => {
        log(`[CRITICAL] Renderer Process Gone: ${JSON.stringify(details)}`);
    });

    // 加载页面 - 从dist目录加载
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    // 开发环境如果需要调试，可以取消注释
    // mainWindow.webContents.openDevTools()
}

// 处理登录请求
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

    // 监听 localStorage 变化 (通过轮询脚本注入)
    const checkTokenScript = `
        setInterval(() => {
            const token = localStorage.getItem('Rh-Refreshtoken');
            const accessToken = localStorage.getItem('Rh-Accesstoken');
            if (token && accessToken) {
                // 这里的 console.log 会被主进程捕获（如果开启了 enableRemoteModule 或者其他方式，简单起见我们监控 cookies）
                // 但更可靠的是监控 Cookies
            }
        }, 1000);
    `;

    // 定义检查并发送 Token 的函数
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

    // 使用 Cookies API 监控 Token
    const filter = {
        urls: ['https://www.runninghub.cn/*']
    };

    session.defaultSession.cookies.on('changed', (event, cookie, cause, removed) => {
        if (cookie.domain.includes('runninghub.cn')) {
            if (cookie.name === 'Rh-Accesstoken' || cookie.name === 'Rh-Refreshtoken') {
                checkAndSendTokens();
            }
        }
    });

    // 也可以通过定期执行 JS 获取 localStorage
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
        } catch (e) {
            // 忽略错误（可能页面还没加载完）
        }
    }, 1000);

    loginWindow.loadURL('https://www.runninghub.cn/login');

    loginWindow.on('closed', () => {
        loginWindow = null;
        clearInterval(pollInterval);
    });
});

// 处理批量下载请求 - 打包为 ZIP
ipcMain.handle('download-files', async (event, files) => {
    if (!mainWindow) return { success: false, message: 'Window not found' };

    const archiver = require('archiver');
    const os = require('os');

    // 1. 先让用户选择 ZIP 保存位置
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const defaultName = `RunningHub_Batch_${timestamp}.zip`;

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: '保存批量下载',
        defaultPath: path.join(app.getPath('downloads'), defaultName),
        filters: [{ name: 'ZIP 压缩包', extensions: ['zip'] }]
    });

    if (canceled || !filePath) {
        return { success: false, message: 'User canceled' };
    }

    // 2. 创建临时目录用于下载
    const tempDir = path.join(os.tmpdir(), `rh_batch_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // 3. 下载单个文件的函数
    const downloadFile = (url, fileName) => {
        return new Promise((resolve, reject) => {
            const destPath = path.join(tempDir, fileName);
            const fileStream = fs.createWriteStream(destPath);
            const protocol = url.startsWith('https') ? https : http;

            const request = protocol.get(url, (response) => {
                // 处理重定向
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

    // 进度发送函数
    const sendProgress = (current, total) => {
        event.sender.send('download-progress', { current, total });
    };

    // 4. 并行下载所有文件到临时目录 (使用 allSettled 确保所有任务完成)
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

    // 统计成功和失败数量
    const successCount = downloadResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failCount = downloadResults.length - successCount;

    // 5. 创建 ZIP 文件
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

        // 6. 清理临时目录
        fs.rmSync(tempDir, { recursive: true, force: true });

        return {
            success: true,
            message: `已打包为 ZIP：成功 ${successCount} 个，失败 ${failCount} 个`,
            stats: { success: successCount, fail: failCount }
        };
    } catch (err) {
        console.error('ZIP creation failed:', err);
        // 清理临时目录
        fs.rmSync(tempDir, { recursive: true, force: true });
        return {
            success: false,
            message: `ZIP 创建失败: ${err.message}`,
            stats: { success: successCount, fail: failCount }
        };
    }
});


// 创建自定义中文菜单
function createMenu() {
    const isMac = process.platform === 'darwin'

    const template = [
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about', label: '关于 RunningHub AI' },
                { type: 'separator' },
                { role: 'services', label: '服务' },
                { type: 'separator' },
                { role: 'hide', label: '隐藏 RunningHub AI' },
                { role: 'hideOthers', label: '隐藏其他' },
                { role: 'unhide', label: '显示全部' },
                { type: 'separator' },
                { role: 'quit', label: '退出 RunningHub AI' }
            ]
        }] : []),
        {
            label: '文件',
            submenu: [
                isMac ? { role: 'close', label: '关闭' } : { role: 'quit', label: '退出' }
            ]
        },
        {
            label: '编辑',
            submenu: [
                { role: 'undo', label: '撤销' },
                { role: 'redo', label: '重做' },
                { type: 'separator' },
                { role: 'cut', label: '剪切' },
                { role: 'copy', label: '复制' },
                { role: 'paste', label: '粘贴' },
                { role: 'selectAll', label: '全选' }
            ]
        },
        {
            label: '视图',
            submenu: [
                { role: 'reload', label: '重新加载' },
                { role: 'forceReload', label: '强制重新加载' },
                { role: 'toggleDevTools', label: '切换开发者工具' },
                { type: 'separator' },
                { role: 'resetZoom', label: '重置缩放' },
                { role: 'zoomIn', label: '放大' },
                { role: 'zoomOut', label: '缩小' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: '切换全屏' }
            ]
        },
        {
            label: '窗口',
            submenu: [
                { role: 'minimize', label: '最小化' },
                { role: 'close', label: '关闭' }
            ]
        },
        {
            role: 'help',
            label: '帮助',
            submenu: [
                {
                    label: '关于 RunningHub AI',
                    click: async () => {
                        mainWindow.webContents.send('show-about-dialog');
                    }
                },
                { type: 'separator' },
                {
                    label: '打开日志文件夹',
                    click: async () => {
                        const userDataPath = app.getPath('userData');
                        shell.openPath(userDataPath);
                    }
                },
                {
                    label: '查看崩溃日志 (crash.log)',
                    click: async () => {
                        const crashLogPath = path.join(app.getPath('userData'), 'crash.log');
                        if (fs.existsSync(crashLogPath)) {
                            shell.showItemInFolder(crashLogPath);
                        } else {
                            dialog.showMessageBox({
                                type: 'info',
                                message: '暂无崩溃日志',
                                detail: 'crash.log 文件不存在，说明可能没有发生过由于主进程记录的崩溃。',
                                buttons: ['确定']
                            });
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: '访问官网',
                    click: async () => {
                        await shell.openExternal('https://www.runninghub.cn')
                    }
                }
            ]
        }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}

// 应用准备就绪时创建窗口
app.whenReady().then(() => {
    createMenu();
    createWindow();
})

// 所有窗口关闭时退出
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// macOS: 点击dock图标时重新创建窗口
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})
