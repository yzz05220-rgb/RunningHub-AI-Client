/// <reference types="vite/client" />

interface Window {
    electronAPI: {
        platform: string;

        // Auto Updater
        checkUpdate: () => void;
        startDownload: () => void;
        quitAndInstall: () => void;

        onUpdateAvailable: (callback: (info: any) => void) => () => void;
        onUpdateNotAvailable: (callback: (info: any) => void) => () => void;
        onUpdateError: (callback: (message: string) => void) => () => void;
        onUpdateDownloadProgress: (callback: (progress: any) => void) => () => void;
        onUpdateDownloaded: (callback: (info: any) => void) => () => void;

        // Batch Download
        downloadFiles: (files: { name: string; url: string }[]) => Promise<{ success: boolean; message?: string; stats?: any }>;
        onDownloadProgress: (callback: (event: any, data: { current: number; total: number }) => void) => () => void;

        // Login (Legacy)
        openLogin: () => Promise<void>;
        onLoginSuccess: (callback: (event: any, tokens: any) => void) => () => void;

        // About
        onShowAbout: (callback: () => void) => () => void;
    };
}
