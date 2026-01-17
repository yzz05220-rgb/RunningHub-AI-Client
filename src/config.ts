/**
 * 全局应用配置
 * 用于管理不同环境下的常量配置
 */
export const APP_CONFIG = {
    /**
     * 客户端自动更新检测地址 (version.json)
     * 包含 version, changelog, downloadUrl 等信息
     * 仅在 Electron 环境下使用
     */
    UPDATE_CHECK_URL: 'https://xz.wuwo.casa/runninghub-client/version.json',

    /**
     * Web 应用基础配置 (如果需要)
     */
    API_BASE_URL: import.meta.env.VITE_API_HOST || '',
};
