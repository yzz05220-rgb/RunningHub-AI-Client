import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * 管理单个 ObjectURL 的 Hook
 * 自动在组件卸载或 URL 更新时清理旧的 ObjectURL
 */
export const useObjectUrl = () => {
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  // 清理函数
  const cleanup = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  // 从 Blob 或 File 创建 URL
  const createUrl = useCallback((source: Blob | File) => {
    cleanup();
    const newUrl = URL.createObjectURL(source);
    urlRef.current = newUrl;
    setUrl(newUrl);
    return newUrl;
  }, [cleanup]);

  // 清除 URL
  const clearUrl = useCallback(() => {
    cleanup();
    setUrl(null);
  }, [cleanup]);

  // 组件卸载时清理
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    url,
    createUrl,
    clearUrl,
  };
};

/**
 * 管理多个 ObjectURL 的 Hook
 * 使用 key-value 形式存储，自动清理
 */
export const useObjectUrls = () => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const urlsRef = useRef<Record<string, string>>({});

  // 清理单个 URL
  const revokeUrl = useCallback((key: string) => {
    if (urlsRef.current[key]) {
      URL.revokeObjectURL(urlsRef.current[key]);
      delete urlsRef.current[key];
    }
  }, []);

  // 清理所有 URL
  const revokeAll = useCallback(() => {
    Object.values(urlsRef.current).forEach((url: string) => {
      URL.revokeObjectURL(url);
    });
    urlsRef.current = {};
  }, []);

  // 创建或更新 URL
  const setUrl = useCallback((key: string, source: Blob | File) => {
    // 先清理旧的
    revokeUrl(key);
    
    // 创建新的
    const newUrl = URL.createObjectURL(source);
    urlsRef.current[key] = newUrl;
    
    setUrls(prev => ({ ...prev, [key]: newUrl }));
    return newUrl;
  }, [revokeUrl]);

  // 删除 URL
  const removeUrl = useCallback((key: string) => {
    revokeUrl(key);
    setUrls(prev => {
      const newUrls = { ...prev };
      delete newUrls[key];
      return newUrls;
    });
  }, [revokeUrl]);

  // 清除所有
  const clearAll = useCallback(() => {
    revokeAll();
    setUrls({});
  }, [revokeAll]);

  // 组件卸载时清理所有
  useEffect(() => {
    return revokeAll;
  }, [revokeAll]);

  return {
    urls,
    setUrl,
    removeUrl,
    clearAll,
    getUrl: (key: string) => urls[key] || null,
  };
};

export default useObjectUrl;
