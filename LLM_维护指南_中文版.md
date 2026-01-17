# RunningHub AI 客户端 - LLM 维护与进化指南 (中文版)

## 1. 项目背景
这是一个基于 **React + Vite + TypeScript + Electron** 构建的桌面 AI 客户端。它通过 API Key 连接 RunningHub AI 服务。项目核心目标是为“零基础小白”提供极致简单的“一键式”体验，并支持全自动更新。

## 2. 核心技术栈
- **前端**: React 19, Tailwind CSS, Lucide 图标库, Zustand (状态管理)。
- **桌面端**: Electron 40+, 使用 `electron-updater` 实现自动更新。
- **构建工具**: Vite (Web端), `electron-builder` (桌面端打包)。
- **CI/CD**: GitHub Actions (用于自动化构建并发布 `.exe` 及其更新元数据)。

## 3. 关键功能模块
- **图片尺寸统一工具**: 位于 `components/ImageResizer.tsx`，支持批量处理和多种缩放模式。
- **自动更新系统**: 由 `electron/main.js` (主进程) 和 `components/UpdateNotification.tsx` (前端提醒) 协同工作。
- **应用管理**: 通过 `services/appService.ts` 处理本地收藏与远程应用的同步。

## 4. 标准维护流程 (供 AI 参考)

### A. 开发新功能规范
1. **UI 一致性**: 必须遵循深色主题色调（背景：`#14171d`，主色：`brand-500`）。
2. **类型安全**: 严禁使用 `any`，所有新数据结构需在 `types.ts` 中定义。
3. **内存管理**: 处理图片预览时，必须使用 `hooks/useObjectUrl.ts` 确保在组件销毁时调用 `URL.revokeObjectURL`。

### B. 版本发布与更新流程 (核心步骤)
当需要发布新版本时，请引导用户执行以下精确步骤：
1. **修改版本号**: 在 `package.json` 中增加 `"version": "x.y.z"`。
2. **更新日志**: 在 `CHANGELOG.md` 中记录本次修改内容。
3. **Git 提交与打标签**: 指导用户运行以下命令：
   ```bash
   git add .
   git commit -m "chore: 发布版本 vX.Y.Z"
   git tag vX.Y.Z
   git push origin main --tags
   ```
4. **自动发布**: GitHub Actions 会自动完成以下操作：
   - 在 Windows 环境下构建 `.exe` 安装包
   - 生成 `latest.yml` 更新元数据
   - 创建 GitHub Release 并自动发布（无需手动点击）
   - 客户端将在 5-10 分钟内检测到新版本

### C. 常见问题排查
- **更新检测不到**: 检查 GitHub Release 附件中是否包含 `latest.yml`。确保 `package.json` 中的版本号高于当前安装的版本。
- **IPC 通信失败**: 检查 `electron/preload.js` 是否已通过 `contextBridge` 暴露了新的 API 接口。

## 5. 未来建议
- **插件系统**: 允许用户自定义图片处理脚本。
- **历史记录搜索**: 为任务历史记录添加模糊搜索功能。
- **主题定制**: 支持用户自定义主题色。

---
**给 AI 的指令**: 当你被要求修改此项目时，请先阅读 `package.json` 和 `electron/main.js` 以了解当前状态。始终将“小白用户”的易用性放在首位。
