import { useState, useEffect, useCallback } from 'react';
import { getAccountInfo } from '../services/api';
import { AccountInfo } from '../types';

interface ApiKeyValidationState {
  isValid: boolean | null;
  isValidating: boolean;
  accountInfo: AccountInfo | null;
  error: string | null;
}

interface UseApiKeyValidationReturn extends ApiKeyValidationState {
  validate: (apiKey: string) => Promise<boolean>;
  reset: () => void;
}

/**
 * API Key 验证 Hook
 * 支持防抖验证和手动验证
 * @param apiKey API Key
 * @param debounceMs 防抖延迟（毫秒），设为 0 禁用自动验证
 */
export const useApiKeyValidation = (
  apiKey: string,
  debounceMs: number = 500
): UseApiKeyValidationReturn => {
  const [state, setState] = useState<ApiKeyValidationState>({
    isValid: null,
    isValidating: false,
    accountInfo: null,
    error: null,
  });

  // 手动验证函数
  const validate = useCallback(async (key: string): Promise<boolean> => {
    if (!key || key.trim().length < 10) {
      setState({
        isValid: null,
        isValidating: false,
        accountInfo: null,
        error: null,
      });
      return false;
    }

    setState(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      const info = await getAccountInfo(key);
      setState({
        isValid: true,
        isValidating: false,
        accountInfo: info,
        error: null,
      });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '验证失败';
      setState({
        isValid: false,
        isValidating: false,
        accountInfo: null,
        error: errorMessage,
      });
      return false;
    }
  }, []);

  // 重置状态
  const reset = useCallback(() => {
    setState({
      isValid: null,
      isValidating: false,
      accountInfo: null,
      error: null,
    });
  }, []);

  // 自动防抖验证
  useEffect(() => {
    if (debounceMs <= 0) return;

    if (!apiKey || apiKey.trim().length < 10) {
      setState({
        isValid: null,
        isValidating: false,
        accountInfo: null,
        error: null,
      });
      return;
    }

    const timer = setTimeout(() => {
      validate(apiKey);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [apiKey, debounceMs, validate]);

  return {
    ...state,
    validate,
    reset,
  };
};

export default useApiKeyValidation;
