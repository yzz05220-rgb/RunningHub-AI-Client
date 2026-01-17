import { FavoriteAppInfo } from './api';

// --- Storage Keys ---
const STORAGE_KEY_APP_POOL = 'rh_app_pool';         // 中间区域的应用池（从RH同步+本地管理）
const STORAGE_KEY_LOCAL_FAVORITES = 'rh_local_favorites'; // 左侧本地收藏（ID列表）
const STORAGE_KEY_API_KEY = 'rh_api_key';
const STORAGE_KEY_ACCESS_TOKEN = 'rh_access_token';
const STORAGE_KEY_REFRESH_TOKEN = 'rh_refresh_token';

// App pool item with local management fields
export interface AppPoolItem extends FavoriteAppInfo {
    addedAt: number;  // 添加时间
    isLocalFavorite: boolean; // 是否在本地收藏
}

export const appService = {
    // ===== APP POOL (中间区域) =====

    /**
     * 获取所有应用池中的应用
     */
    getAppPool: (): AppPoolItem[] => {
        try {
            const json = localStorage.getItem(STORAGE_KEY_APP_POOL);
            return json ? JSON.parse(json) : [];
        } catch (e) {
            console.error('Failed to load app pool', e);
            return [];
        }
    },

    /**
     * 保存应用池
     */
    saveAppPool: (apps: AppPoolItem[]): void => {
        localStorage.setItem(STORAGE_KEY_APP_POOL, JSON.stringify(apps));
    },

    /**
     * 从 RH 同步应用（去重添加）
     * 返回新增的数量
     */
    syncFromRH: (rhApps: FavoriteAppInfo[]): { added: number; total: number } => {
        const existingPool = appService.getAppPool();
        const existingIds = new Set(existingPool.map(a => a.id));

        let addedCount = 0;
        const newApps: AppPoolItem[] = [];

        for (const app of rhApps) {
            if (!existingIds.has(app.id)) {
                newApps.push({
                    ...app,
                    addedAt: Date.now(),
                    isLocalFavorite: false
                });
                addedCount++;
            }
        }

        // 将新应用添加到池子顶部
        const updatedPool = [...newApps, ...existingPool];
        appService.saveAppPool(updatedPool);

        return { added: addedCount, total: updatedPool.length };
    },

    /**
     * 从应用池删除应用
     */
    removeFromPool: (appId: string): void => {
        const pool = appService.getAppPool();
        const filtered = pool.filter(a => a.id !== appId);
        appService.saveAppPool(filtered);

        // 同时从本地收藏移除
        appService.removeLocalFavorite(appId);
    },

    /**
     * 根据ID获取应用
     */
    getAppById: (appId: string): AppPoolItem | undefined => {
        return appService.getAppPool().find(a => a.id === appId);
    },

    // ===== LOCAL FAVORITES (左侧本地收藏) =====

    /**
     * 获取本地收藏的应用ID列表
     */
    getLocalFavoriteIds: (): string[] => {
        try {
            const json = localStorage.getItem(STORAGE_KEY_LOCAL_FAVORITES);
            return json ? JSON.parse(json) : [];
        } catch (e) {
            return [];
        }
    },

    /**
     * 获取本地收藏的应用（完整信息）
     */
    getLocalFavorites: (): AppPoolItem[] => {
        const ids = appService.getLocalFavoriteIds();
        const pool = appService.getAppPool();
        return pool.filter(a => ids.includes(a.id));
    },

    /**
     * 添加到本地收藏
     */
    addLocalFavorite: (appId: string): void => {
        const ids = appService.getLocalFavoriteIds();
        if (!ids.includes(appId)) {
            ids.unshift(appId);
            localStorage.setItem(STORAGE_KEY_LOCAL_FAVORITES, JSON.stringify(ids));

            // 更新池子中的标记
            const pool = appService.getAppPool();
            const app = pool.find(a => a.id === appId);
            if (app) {
                app.isLocalFavorite = true;
                appService.saveAppPool(pool);
            }
        }
    },

    /**
     * 从本地收藏移除
     */
    removeLocalFavorite: (appId: string): void => {
        const ids = appService.getLocalFavoriteIds();
        const filtered = ids.filter(id => id !== appId);
        localStorage.setItem(STORAGE_KEY_LOCAL_FAVORITES, JSON.stringify(filtered));

        // 更新池子中的标记
        const pool = appService.getAppPool();
        const app = pool.find(a => a.id === appId);
        if (app) {
            app.isLocalFavorite = false;
            appService.saveAppPool(pool);
        }
    },

    /**
     * 切换本地收藏状态
     */
    toggleLocalFavorite: (appId: string): boolean => {
        const ids = appService.getLocalFavoriteIds();
        if (ids.includes(appId)) {
            appService.removeLocalFavorite(appId);
            return false;
        } else {
            appService.addLocalFavorite(appId);
            return true;
        }
    },

    // ===== RECOMMENDED (预设推荐) =====

    /**
     * 获取预设推荐应用
     * 这里返回空数组，因为用户没有预设
     */
    getRecommendedApps: (): AppPoolItem[] => {
        // 目前返回空，后续可以预设一些应用
        return [];
    },

    // ===== CONFIG =====

    getApiKey: (): string => {
        return localStorage.getItem(STORAGE_KEY_API_KEY) || '';
    },

    setApiKey: (key: string): void => {
        localStorage.setItem(STORAGE_KEY_API_KEY, key);
    },

    getAccessToken: (): string => {
        return localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN) || '';
    },

    setAccessToken: (token: string): void => {
        localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, token);
    },

    getRefreshToken: (): string => {
        return localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN) || '';
    },

    setRefreshToken: (token: string): void => {
        localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, token);
    }
};
