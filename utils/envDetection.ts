/**
 * 环境检测工具
 * 用于区分 Web 浏览器环境和 Electron 客户端环境
 */

/**
 * 检测当前是否运行在 Web 浏览器环境（非 Electron）
 * @returns {boolean} true 表示 Web 环境，false 表示 Electron 环境
 */
export const isWebEnvironment = (): boolean => {
    // 检查是否存在 window.electronAPI （由 Electron preload 注入）
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
        return false;
    }

    // 检查 userAgent 是否包含 Electron
    if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron')) {
        return false;
    }

    // 默认认为是 Web 环境
    return true;
};

/**
 * 检测当前是否运行在 Electron 客户端环境
 * @returns {boolean} true 表示 Electron 环境，false 表示 Web 环境
 */
export const isElectronEnvironment = (): boolean => {
    return !isWebEnvironment();
};

/**
 * 获取当前运行环境的名称
 * @returns {'web' | 'electron'} 环境名称
 */
export const getEnvironment = (): 'web' | 'electron' => {
    return isWebEnvironment() ? 'web' : 'electron';
};
