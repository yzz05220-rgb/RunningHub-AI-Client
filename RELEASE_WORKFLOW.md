# 完全自动化的版本发布流程说明

## 概述
本项目已实现**完全自动化**的版本发布流程。您只需执行 3 条 Git 命令，剩下的所有工作（构建、打包、发布、更新元数据生成）都由 GitHub Actions 自动完成。

## 发布新版本的完整步骤

### 1. 修改版本号
编辑 `package.json`，将 `version` 字段增加：
```json
{
  "version": "1.3.6"  // 从 1.3.5 改为 1.3.6
}
```

### 2. 更新变更日志（可选但推荐）
在 `CHANGELOG.md` 中记录本次更新的内容：
```markdown
## [1.3.6] - 2026-01-17
### 新增
- 添加了图片批量处理功能
### 修复
- 修复了内存泄漏问题
```

### 3. 提交并打标签
在终端执行以下命令：
```bash
git add .
git commit -m "chore: release v1.3.6"
git tag v1.3.6
git push origin main --tags
```

### 4. 等待自动化完成
推送 Tag 后，GitHub Actions 会自动执行以下操作：

1. **触发构建**（约 5-10 分钟）
   - 在 Windows 环境下安装依赖
   - 运行 Vite 构建前端
   - 使用 electron-builder 打包 `.exe` 安装程序
   - 生成 `latest.yml` 更新元数据

2. **自动发布 Release**
   - 创建 GitHub Release（标题为 Tag 名称）
   - 自动生成 Release Notes（基于 Git 提交记录）
   - 上传 `.exe` 安装包和 `latest.yml` 到 Release 附件
   - **直接发布**（不是草稿，无需手动点击）

3. **客户端自动检测**
   - 已安装的客户端会在启动时或定期检查更新
   - 发现新版本后右下角弹出更新提醒
   - 用户点击"立即下载"后自动下载并安装

## 验证发布是否成功

### 方法 1：查看 GitHub Actions 状态
1. 访问您的 GitHub 仓库
2. 点击顶部的 **Actions** 标签
3. 查看最新的 "Build and Release" 工作流是否显示绿色勾号

### 方法 2：检查 Releases 页面
1. 访问 `https://github.com/yzz05220-rgb/RunningHub-AI-Client/releases`
2. 确认最新的 Release 已发布（不是 Draft）
3. 检查附件中是否包含：
   - `RunningHub-AI-Setup-x.x.x.exe`
   - `latest.yml`

## 常见问题

### Q: 如果构建失败怎么办？
A: 查看 GitHub Actions 的错误日志，通常是依赖安装或构建脚本问题。修复后重新打 Tag 并推送。

### Q: 客户端检测不到更新？
A: 确保：
1. Release 已发布（不是 Draft）
2. `latest.yml` 文件存在于 Release 附件中
3. 新版本号高于客户端当前版本

### Q: 可以跳过某个版本号吗？
A: 可以，但建议遵循语义化版本规范（Semantic Versioning）。

## 技术细节

### GitHub Actions 工作流文件
位置：`.github/workflows/release.yml`

关键步骤：
- 使用 `softprops/action-gh-release@v1` 自动创建并发布 Release
- 设置 `draft: false` 确保直接发布
- 设置 `generate_release_notes: true` 自动生成更新说明

### electron-updater 配置
位置：`package.json` 的 `build.publish` 字段

```json
"publish": [
  {
    "provider": "github",
    "owner": "yzz05220-rgb",
    "repo": "RunningHub-AI-Client"
  }
]
```

这告诉 `electron-updater` 从哪里获取更新信息。

---

**总结**：现在您只需关注代码开发，版本发布的所有繁琐步骤都已自动化。享受高效的开发体验吧！
