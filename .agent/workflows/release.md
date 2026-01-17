---
description: 完整的客户端发布流程，包括版本更新、构建和上传
---

# RunningHub AI 客户端发布流程

## 前置条件

- 已完成代码修改和测试
- 服务器 xz.wuwo.casa 可访问

## 发布步骤

### 1. 更新版本号

```powershell
# 编辑 package.json 中的 version 字段
# 例如: "1.2.13" -> "1.3.0"
```

### 2. 构建安装包

```powershell
cd C:\Users\无我\Desktop\vibe\RunningHub-AI-Client
// turbo
npm run build:win
```

### 3. 更新服务器 version.json

在服务器 `xz.wuwo.casa` 的 `/download/runninghub-client/` 目录下更新 `version.json`:

```json
{
    "version": "1.3.0",
    "releaseDate": "2026-01-17",
    "changelog": "新版本更新说明",
    "downloadUrl": "https://xz.wuwo.casa/download/runninghub-client/RunningHub-AI-1.3.0-Setup.exe"
}
```

### 4. 上传安装包

```powershell
# 使用 SCP 或其他方式上传到服务器
# 目标目录: /download/runninghub-client/
scp release\RunningHub-AI-*-Setup.exe user@xz.wuwo.casa:/path/to/download/runninghub-client/
```

### 5. 验证

1. 访问 `https://xz.wuwo.casa/download/runninghub-client/version.json` 确认更新
2. 打开旧版本客户端，确认检测到更新提示

## 服务器目录结构

```
/download/runninghub-client/
├── version.json                    # 版本信息文件
├── RunningHub-AI-1.3.0-Setup.exe   # 当前最新安装包
└── CHANGELOG.md                    # 更新日志 (可选)
```

## 配置说明

客户端检查更新的 URL 配置在 `src/config.ts`:

```typescript
UPDATE_CHECK_URL: 'https://xz.wuwo.casa/download/runninghub-client/version.json'
```
