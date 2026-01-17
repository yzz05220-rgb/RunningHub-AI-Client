# RunningHub AI Client - LLM Maintenance & Evolution Guide

## 1. Project Context
This is a desktop AI client built with **React + Vite + TypeScript + Electron**. It connects to RunningHub AI services via API keys. The project is designed for non-technical users, emphasizing a seamless "one-click" experience and automated updates.

## 2. Core Tech Stack
- **Frontend**: React 19, Tailwind CSS, Lucide Icons, Zustand (State Management).
- **Desktop**: Electron 40+, `electron-updater` for auto-updates.
- **Build Tool**: Vite (Web), `electron-builder` (Desktop).
- **CI/CD**: GitHub Actions for automated `.exe` releases.

## 3. Key Features & Components
- **Image Resizer**: A batch processing tool located in `components/ImageResizer.tsx`.
- **Auto-Update**: Managed by `electron/main.js` and `components/UpdateNotification.tsx`.
- **App Management**: Local and remote app synchronization via `services/appService.ts`.

## 4. Standard Maintenance Workflow (FOR LLM)

### A. Implementing New Features
1. **UI Consistency**: Always use the dark theme palette (`bg-[#14171d]`, `brand-500`).
2. **Type Safety**: Maintain strict TypeScript definitions in `types.ts`. Avoid `any`.
3. **Hooks**: Use custom hooks in `hooks/` for logic separation (e.g., `useObjectUrl` for memory management).

### B. The Release & Update Process (CRITICAL)
When the user wants to release a new version, follow these exact steps:
1. **Version Bump**: Update `"version": "x.y.z"` in `package.json`.
2. **Changelog**: Update `CHANGELOG.md` with new changes.
3. **Git Tagging**: Instruct the user to run:
   ```bash
   git add .
   git commit -m "chore: release vX.Y.Z"
   git tag vX.Y.Z
   git push origin main --tags
   ```
4. **Automated Publishing**: GitHub Actions will automatically:
   - Build the `.exe` installer on Windows
   - Generate `latest.yml` update metadata
   - Create and publish the GitHub Release (no manual action required)
   - Clients will detect the update within 5-10 minutes

### C. Common Troubleshooting Tasks
- **Update Not Triggering**: Check if `latest.yml` is correctly generated in the Release assets. Ensure the version in `package.json` is higher than the current one.
- **Memory Leaks**: Ensure `URL.revokeObjectURL` is called for image previews (use `useObjectUrl` hook).
- **IPC Errors**: Check `electron/preload.js` to ensure new APIs are exposed via `contextBridge`.

## 5. Future Roadmap Suggestions
- **Plugin System**: Allow users to add custom image processing scripts.
- **Local History Search**: Implement fuzzy search for the task history store.
- **Theme Customization**: Add support for user-defined accent colors.

---
**Instruction to LLM**: When asked to modify this project, first read `package.json` and `electron/main.js` to understand the current state. Always prioritize user experience for "non-technical" users.
