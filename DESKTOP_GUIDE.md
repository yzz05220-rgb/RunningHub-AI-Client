# RunningHub AI 桌面端开发与发布指南

本项目已集成 Electron，支持构建 Windows 桌面端应用，并具备基于 GitHub Releases 的全自动更新功能。

## 1. 开发环境运行

在本地开发时，可以使用以下命令同时启动 Vite 开发服务器和 Electron 窗口：

```bash
npm run electron:dev
```

## 2. 自动更新机制说明

自动更新基于 `electron-updater` 和 GitHub Releases 实现，流程如下：

1.  **检测**：应用启动时或用户在“关于”页面点击“检查更新”时，会访问 GitHub Repo 的最新 Release。
2.  **提醒**：发现新版本且未被用户忽略时，右下角会弹出更新提醒。
3.  **下载**：用户点击“立即下载”后，应用在后台静默下载，并显示进度条。
4.  **安装**：下载完成后，用户点击“重启并安装”，应用将自动关闭、安装新版本并重新启动。

## 3. 如何发布新版本

为了让自动更新生效，您必须按照以下步骤发布：

### 自动化发布（推荐）

1.  修改 `package.json` 中的 `version`（例如从 `1.3.5` 改为 `1.3.6`）。
2.  提交代码并打上对应的 Git Tag：
    ```bash
    git add .
    git commit -m "chore: bump version to 1.3.6"
    git tag v1.3.6
    git push origin main --tags
    ```
3.  **完全自动化**：GitHub Actions 会自动完成以下所有操作：
    - 在 Windows 环境下构建 `.exe` 安装包
    - 生成 `latest.yml` 更新元数据
    - 创建 GitHub Release 并自动发布（无需手动点击）
    - 客户端将在 5-10 分钟内检测到新版本

### 本地手动发布

如果您想在本地打包并上传：
```bash
# 需要先设置环境变量（Windows PowerShell）
$env:GH_TOKEN="您的GitHub_Personal_Access_Token"
npm run electron:publish
```

## 4. 小白用户安装建议

-   发布后，请引导用户下载 `RunningHub-AI-Setup-x.x.x.exe`。
-   该安装程序会自动处理所有依赖，用户只需点击“下一步”即可。
-   安装后，应用会自动检查更新，用户无需再次手动下载安装包。

## 5. 注意事项

-   **图标**：请确保 `public/logo.png` 存在，它是生成的 `.exe` 图标。
-   **权限**：GitHub Actions 需要 `GITHUB_TOKEN` 权限来创建 Release，已在工作流文件中配置。
-   **版本号**：每次发布必须增加版本号，否则更新检测将不会触发。
