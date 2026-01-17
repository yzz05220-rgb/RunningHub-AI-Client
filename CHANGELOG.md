# 更新日志 / Changelog

## v1.2.0 - 2026-01-17

### ✨ 新功能

#### 工具函数库 (`utils/`)
- **format.ts**: 统一的格式化函数
  - `formatDuration(ms)`: 格式化时长为 mm:ss 格式
  - `formatDurationChinese(ms)`: 格式化时长为中文描述
  - `formatDate(timestamp)`: 格式化日期时间
  - `formatTime(ts)`: 格式化完整时间
  - `formatRelativeTime(timestamp)`: 格式化相对时间（如“5分钟前”）

- **file.ts**: 文件相关工具函数
  - `getFileType(url)`: 根据 URL 判断文件类型
  - `isUrl(str)`: 判断字符串是否为 URL
  - `getFileNameFromUrl(url)`: 从 URL 中提取文件名
  - `getFileExtension(filename)`: 获取文件扩展名
  - `formatFileSize(bytes)`: 格式化文件大小
  - `downloadFile(url, filename)`: 下载文件

- **error.ts**: 错误处理工具函数
  - `parseHttpError(status, statusText)`: 解析 HTTP 错误为用户友好消息
  - `parseTaskError(reason)`: 解析任务失败原因
  - `parseError(error)`: 解析通用错误
  - `formatErrorMessage(error)`: 格式化错误为显示字符串

#### 自定义 Hooks (`hooks/`)
- **useApiKeyValidation.ts**: API Key 验证 Hook
  - 支持防抖自动验证
  - 支持手动验证
  - 返回验证状态、账户信息和错误信息

- **useObjectUrl.ts**: ObjectURL 管理 Hook
  - `useObjectUrl()`: 管理单个 ObjectURL
  - `useObjectUrls()`: 管理多个 ObjectURL（key-value 形式）
  - 自动清理，防止内存泄漏

- **useKeyboardShortcuts.ts**: 快捷键管理 Hook
  - 支持组合键（Ctrl/Cmd + Key）
  - 自动处理输入框焦点
  - 提供快捷键配置工厂函数
  - 支持格式化快捷键显示

#### 新组件 (`components/`)
- **TaskHistoryItem.tsx**: 任务历史记录项组件
  - 解决了原代码中在循环内使用 Hook 的问题
  - 支持展开/折叠详情
  - 支持删除单个结果或整个任务

- **ErrorDisplay.tsx**: 统一的错误展示组件
  - 支持三种样式：inline、card、toast
  - 显示错误标题、消息和建议
  - 支持重试和关闭操作
  - 可展开查看详细错误信息

- **ApiKeyInput.tsx**: API Key 输入组件
  - 实时验证 API Key 有效性
  - 显示/隐藏密码切换
  - 显示账户信息（余额、运行中任务数）
  - 验证状态指示器

- **AppSearch.tsx**: 应用搜索组件
  - 支持按名称和 ID 搜索
  - 支持按时间、名称排序
  - 提供 `useAppSearch` Hook 用于状态管理

### 🔧 技术优化

#### 类型安全 (`types.ts`)
- 新增 `TaskFailedReason` 接口
- 新增 `TaskOutputResponse` 接口
- 新增 `FileType` 类型
- 新增 `UserFriendlyError` 接口
- 扩展 `BackgroundTask` 接口，添加 `apiKey`、`webappId`、`queuePosition` 字段

#### API 服务 (`services/api.ts`)
- 添加 `fetchWithRetry` 函数，支持自动重试
  - 服务器错误（5xx）自动重试
  - 网络错误自动重试
  - 指数退避延迟
- 改进错误处理，使用 `parseHttpError` 生成用户友好消息
- 新增 `validateApiKey` 函数
- 移除所有 `any` 类型，使用明确的类型定义

#### 任务状态管理 (`stores/taskStore.ts`)
- 移除所有 `as any` 类型断言
- 添加定时器存储和清理机制，防止内存泄漏
- 改进错误处理，使用类型安全的方式
- 任务取消时正确清理定时器

### 🐛 修复

- **StepEditor.tsx Hook 违规**: 原代码在 `map` 循环中使用 `useState`，违反 React Hooks 规则。通过提取 `TaskHistoryItem` 组件解决。
- **内存泄漏**: 
  - 添加 `useObjectUrl` Hook 自动管理 ObjectURL 生命周期
  - `taskStore` 中添加定时器清理逻辑
- **类型不安全**: 移除多处 `any` 类型断言，使用明确的类型定义

### 📝 文档

- 新增 `CODE_REVIEW_REPORT.md`: 完整的代码审查报告

### 📁 新增文件

```
utils/
├── index.ts
├── format.ts
├── file.ts
└── error.ts

hooks/
├── index.ts
├── useApiKeyValidation.ts
├── useObjectUrl.ts
└── useKeyboardShortcuts.ts

components/
├── TaskHistoryItem.tsx
├── ErrorDisplay.tsx
├── ApiKeyInput.tsx
└── AppSearch.tsx
```

---

## v1.1.0 - 2026-01-16

### ✨ 新功能

#### 历史记录界面重构
- **详细任务卡片视图**：历史记录从简单的九宫格图片升级为详细的任务卡片展示
- **展开/收起模式**：
  - 收起状态：仅显示应用名称和结果图片，界面简洁
  - 展开状态：显示完整的任务详情（Task ID、运行时长、完成时间等）
- **圆角卡片设计**：采用 `rounded-2xl` 圆角卡片，与整体 UI 风格一致
- **图片分隔线**：多张结果图片之间使用清晰的分隔线，提升可读性
- **垂直图片堆叠**：所有结果图片采用垂直单列布局，完整显示图片比例
- **自适应文本**：应用名称在展开时支持换行完整显示，收起时自动截断

#### 任务管理器拖拽功能
- **自由拖动**：按住任务管理器标题栏可拖动到屏幕任意位置
- **位置记忆**：使用 LocalStorage 保存位置，刷新页面后位置保持不变
- **边界保护**：防止组件被拖拽到屏幕外
- **视觉反馈**：拖动时光标变为 `grabbing` 手型，提供清晰的操作提示
- **智能交互**：点击按钮不会触发拖拽，确保操作流畅

### 🎨 UI/UX 改进

#### 历史记录侧边栏
- 优化了卡片间距和内边距，视觉更加舒适
- 统一了圆角设计语言（外框 `rounded-2xl`，图片 `rounded-lg`）
- 改进了失败状态的错误信息显示
- 增强了悬浮交互效果（放大预览、下载按钮）

#### 任务管理器
- 添加了 `cursor-grab` 光标样式提示
- 保持了展开/收起功能的正常工作
- 优化了拖拽体验，流畅无卡顿

### 🔧 技术优化

#### 数据结构增强
- `HistoryItem` 接口新增字段：
  - `remoteTaskId`: RunningHub 远程任务 ID
  - `startTime`: 任务开始时间
  - `endTime`: 任务结束时间
  - `appName`: 所属应用名称
  - `appId`: 应用 ID
  - `error`: 错误信息（失败时）

#### 组件重构
- **StepResult.tsx**：完全重写历史记录渲染逻辑
  - 实现了条件渲染（基于 `isExpanded` prop）
  - 优化了图片布局算法
  - 添加了时间格式化工具函数
- **TaskFloater.tsx**：添加拖拽状态管理
  - 使用 React Hooks 管理拖拽状态
  - 实现了防抖和边界检测
  - 集成 localStorage 持久化

#### 性能优化
- 使用 `useEffect` 优化拖拽事件监听器的注册和清理
- 图片懒加载和条件渲染减少不必要的 DOM 操作

### 📝 文件变更

**新增文件**：
- `components/AppLibrarySidebar.tsx`
- `components/TaskFloater.tsx`
- `services/appService.ts`
- `stores/taskStore.ts`

**修改文件**：
- `App.tsx` - 集成新组件和状态管理
- `types.ts` - 扩展类型定义
- `components/StepResult.tsx` - 历史记录界面重构
- `components/StepConfig.tsx` - 细节优化
- `components/StepEditor.tsx` - 微调
- `services/api.ts` - API 集成
- `package.json` / `package-lock.json` - 依赖更新

---

## 使用说明

### 历史记录查看
1. 在右侧边栏点击"展开"图标可查看任务详情
2. 点击任意图片可全屏预览
3. 悬浮在图片上显示操作按钮（放大、下载）

### 任务管理器移动
1. 按住任务管理器顶部区域即可拖动
2. 拖动到合适位置后释放鼠标
3. 位置会自动保存，下次打开时保持不变

---

## 已知问题
- 无

## 下一步计划
- [ ] 添加历史记录搜索和筛选功能
- [ ] 支持任务重新运行
- [ ] 添加批量导出功能
- [ ] 优化移动端适配
