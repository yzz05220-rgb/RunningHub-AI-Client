/**
 * 版本更新检测服务
 * 用于客户端和开发版的自动更新功能
 */

export interface VersionInfo {
    version: string;
    releaseDate: string;
    changelog: string;
    downloadUrl: string;
}

/**
 * 从远程服务器获取最新版本信息
 * @param remoteUrl 远程 version.json 的 URL
 * @returns Promise<VersionInfo> 版本信息
 */
export async function fetchRemoteVersion(remoteUrl: string): Promise<VersionInfo> {
    try {
        const response = await fetch(remoteUrl, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch version info: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching remote version:', error);
        throw error;
    }
}

/**
 * 比较两个语义化版本号
 * @param current 当前版本号 (e.g., "1.1.0")
 * @param remote远程版本号 (e.g., "1.2.0")
 * @returns number 返回 1 表示需要更新，0 表示相同，-1 表示远程版本更旧
 */
export function compareVersions(current: string, remote: string): number {
    const parseCurrent = current.split('.').map(Number);
    const parseRemote = remote.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        const c = parseCurrent[i] || 0;
        const r = parseRemote[i] || 0;

        if (r > c) return 1; // 需要更新
        if (r < c) return -1; // 远程版本更旧
    }

    return 0; // 版本相同
}

/**
 * 检查是否有可用更新
 * @param currentVersion 当前版本号
 * @param remoteUrl 远程 version.json URL
 * @returns Promise<VersionInfo | null> 如果有更新返回版本信息，否则返回 null
 */
export async function checkForUpdates(
    currentVersion: string,
    remoteUrl: string
): Promise<VersionInfo | null> {
    try {
        const remoteVersion = await fetchRemoteVersion(remoteUrl);
        const comparison = compareVersions(currentVersion, remoteVersion.version);

        if (comparison > 0) {
            return remoteVersion;
        }

        return null;
    } catch (error) {
        console.error('Update check failed:', error);
        return null;
    }
}

/**
 * 下载更新包（仅触发下载，实际下载由浏览器或 Electron 处理）
 * @param downloadUrl 下载链接
 */
export function triggerDownload(downloadUrl: string): void {
    if (typeof window === 'undefined') return;

    // 通过创建隐藏的 <a> 标签触发下载
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = '';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
