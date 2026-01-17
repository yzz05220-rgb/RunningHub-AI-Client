import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'

// 等待app ready之前禁止GPU加速
app.disableHardwareAcceleration()

// 设置app名称
app.setName('RunningHub AI')

process.env.DIST_ELECTRON = path.join(__dirname)
process.env.DIST = path.join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
    ? path.join(process.env.DIST_ELECTRON, '../public')
    : process.env.DIST

let mainWindow: BrowserWindow | null = null

// 预加载脚本路径
const preload = path.join(__dirname, 'preload.js')
// 开发服务器URL
const url = process.env.VITE_DEV_SERVER_URL

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 600,
        title: 'RunningHub AI',
        icon: path.join(process.env.PUBLIC!, 'rh.png'),
        webPreferences: {
            preload,
            nodeIntegration: false,
            contextIsolation: true,
        },
        show: false,
        backgroundColor: '#0a0c10',
    })

    // 窗口准备好后显示
    mainWindow.on('ready-to-show', () => {
        mainWindow?.show()
    })

    // 打开外部链接使用默认浏览器
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url)
        }
        return { action: 'deny' }
    })

    // 加载页面
    if (url) {
        mainWindow.loadURL(url)
    } else {
        mainWindow.loadFile(path.join(process.env.DIST!, 'index.html'))
    }
}

// 应用准备就绪时创建窗口
app.whenReady().then(createWindow)

// macOS: 所有窗口关闭时不退出
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
