/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_HOST: string
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

interface Window {
    electronAPI: {
        platform: string;
        openLogin: () => Promise<void>;
        onLoginSuccess: (callback: (event: any, tokens: any) => void) => () => void;
        downloadFiles: (files: { url: string; name: string }[]) => Promise<{ success: boolean; message: string }>;
        onDownloadProgress: (callback: (event: any, data: { current: number; total: number }) => void) => () => void;
        onShowAbout: (callback: () => void) => () => void;
    }
}
