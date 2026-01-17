import { useEffect, useCallback, useRef } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: KeyHandler;
  description?: string;
  preventDefault?: boolean;
}

/**
 * 快捷键管理 Hook
 * @param shortcuts 快捷键配置数组
 * @param enabled 是否启用快捷键
 */
export const useKeyboardShortcuts = (
  shortcuts: ShortcutConfig[],
  enabled: boolean = true
) => {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 如果焦点在输入框中，忽略大部分快捷键（除了 Escape）
    const target = event.target as HTMLElement;
    const isInputFocused = 
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable;

    for (const shortcut of shortcutsRef.current) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey;
      const metaMatch = shortcut.meta ? event.metaKey : true;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;

      // 对于 Escape 键，始终响应
      const isEscape = shortcut.key.toLowerCase() === 'escape';

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        // 如果在输入框中且不是 Escape，跳过
        if (isInputFocused && !isEscape && !shortcut.ctrl && !shortcut.meta) {
          continue;
        }

        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.handler(event);
        break;
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
};

/**
 * 常用快捷键配置工厂
 */
export const createShortcuts = {
  // Ctrl/Cmd + Enter: 运行
  run: (handler: KeyHandler): ShortcutConfig => ({
    key: 'Enter',
    ctrl: true,
    handler,
    description: '运行任务',
  }),

  // Ctrl/Cmd + S: 保存
  save: (handler: KeyHandler): ShortcutConfig => ({
    key: 's',
    ctrl: true,
    handler,
    description: '保存',
  }),

  // Escape: 关闭/取消
  escape: (handler: KeyHandler): ShortcutConfig => ({
    key: 'Escape',
    handler,
    description: '关闭/取消',
  }),

  // Ctrl/Cmd + K: 搜索
  search: (handler: KeyHandler): ShortcutConfig => ({
    key: 'k',
    ctrl: true,
    handler,
    description: '搜索',
  }),

  // Ctrl/Cmd + N: 新建
  new: (handler: KeyHandler): ShortcutConfig => ({
    key: 'n',
    ctrl: true,
    handler,
    description: '新建',
  }),

  // Ctrl/Cmd + B: 批量模式
  batch: (handler: KeyHandler): ShortcutConfig => ({
    key: 'b',
    ctrl: true,
    handler,
    description: '批量模式',
  }),
};

/**
 * 格式化快捷键显示
 */
export const formatShortcut = (shortcut: ShortcutConfig): string => {
  const parts: string[] = [];
  
  // 检测操作系统
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  if (shortcut.ctrl || shortcut.meta) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  // 格式化按键名
  let keyName = shortcut.key;
  switch (shortcut.key.toLowerCase()) {
    case 'enter':
      keyName = isMac ? '↵' : 'Enter';
      break;
    case 'escape':
      keyName = 'Esc';
      break;
    case 'arrowup':
      keyName = '↑';
      break;
    case 'arrowdown':
      keyName = '↓';
      break;
    case 'arrowleft':
      keyName = '←';
      break;
    case 'arrowright':
      keyName = '→';
      break;
    default:
      keyName = shortcut.key.toUpperCase();
  }

  parts.push(keyName);

  return parts.join(isMac ? '' : '+');
};

export default useKeyboardShortcuts;
