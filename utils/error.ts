/**
 * 错误处理工具函数
 */

import { UserFriendlyError, TaskFailedReason } from '../types';

// HTTP 状态码对应的用户友好消息
const HTTP_ERROR_MESSAGES: Record<number, { title: string; suggestion: string }> = {
  400: { title: '请求参数错误', suggestion: '请检查输入参数是否正确' },
  401: { title: 'API Key 无效或已过期', suggestion: '请在设置中检查并更新您的 API Key' },
  403: { title: '没有权限访问此资源', suggestion: '请确认您的账户权限或联系管理员' },
  404: { title: '应用不存在或已下架', suggestion: '请检查应用 ID 是否正确，或尝试其他应用' },
  429: { title: '请求过于频繁', suggestion: '请稍等片刻后重试' },
  500: { title: '服务器内部错误', suggestion: '请稍后重试，如问题持续请联系支持' },
  502: { title: '服务暂时不可用', suggestion: '请稍后重试' },
  503: { title: '服务维护中', suggestion: '请稍后重试' },
};

// 常见错误关键词映射
const ERROR_KEYWORD_MESSAGES: Array<{ keywords: string[]; error: { title: string; suggestion: string } }> = [
  {
    keywords: ['CUDA out of memory', 'OOM', 'out of memory'],
    error: { title: '显存不足', suggestion: '尝试降低图片分辨率或减少批量数量' }
  },
  {
    keywords: ['Invalid API Key', 'invalid api key', 'apikey'],
    error: { title: 'API Key 无效', suggestion: '请检查 API Key 是否正确，或重新生成' }
  },
  {
    keywords: ['Rate limit', 'rate limit', 'too many requests'],
    error: { title: '请求频率限制', suggestion: '请稍等片刻后重试' }
  },
  {
    keywords: ['timeout', 'Timeout', 'TIMEOUT'],
    error: { title: '请求超时', suggestion: '网络连接较慢，请检查网络后重试' }
  },
  {
    keywords: ['network', 'Network', 'ECONNREFUSED', 'ENOTFOUND'],
    error: { title: '网络连接失败', suggestion: '请检查网络连接是否正常' }
  },
  {
    keywords: ['user not exist', 'User not exist'],
    error: { title: '用户不存在', suggestion: '请检查 API Key 是否正确，或账户状态是否正常' }
  },
  {
    keywords: ['insufficient', 'balance', '余额不足'],
    error: { title: '账户余额不足', suggestion: '请充值后重试' }
  },
  {
    keywords: ['queue', 'Queue', '排队'],
    error: { title: '服务繁忙', suggestion: '当前排队人数较多，请耐心等待' }
  },
];

/**
 * 解析 HTTP 错误
 * @param status HTTP 状态码
 * @param statusText 状态文本
 * @returns 用户友好的错误信息
 */
export const parseHttpError = (status: number, statusText?: string): UserFriendlyError => {
  const knownError = HTTP_ERROR_MESSAGES[status];
  
  if (knownError) {
    return {
      title: knownError.title,
      message: `HTTP ${status}: ${statusText || ''}`,
      suggestion: knownError.suggestion,
    };
  }
  
  return {
    title: '请求失败',
    message: `HTTP ${status}: ${statusText || '未知错误'}`,
    suggestion: '请稍后重试，如问题持续请联系支持',
  };
};

/**
 * 解析任务失败原因
 * @param reason 任务失败原因
 * @returns 用户友好的错误信息
 */
export const parseTaskError = (reason: TaskFailedReason): UserFriendlyError => {
  const errorMessage = reason.exception_message || reason.exception_type || '未知错误';
  
  // 尝试匹配已知错误类型
  for (const { keywords, error } of ERROR_KEYWORD_MESSAGES) {
    if (keywords.some(keyword => errorMessage.includes(keyword))) {
      return {
        title: error.title,
        message: `[${reason.node_name || 'Node'}] ${errorMessage}`,
        suggestion: error.suggestion,
        originalError: reason.traceback,
      };
    }
  }
  
  return {
    title: '任务执行失败',
    message: `[${reason.node_name || 'Node'}] ${errorMessage}`,
    suggestion: '请检查参数设置，或尝试使用不同的输入',
    originalError: reason.traceback,
  };
};

/**
 * 解析通用错误
 * @param error 错误对象或字符串
 * @returns 用户友好的错误信息
 */
export const parseError = (error: unknown): UserFriendlyError => {
  let errorMessage = '未知错误';
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  // 尝试匹配已知错误类型
  for (const { keywords, error: knownError } of ERROR_KEYWORD_MESSAGES) {
    if (keywords.some(keyword => errorMessage.includes(keyword))) {
      return {
        title: knownError.title,
        message: errorMessage,
        suggestion: knownError.suggestion,
      };
    }
  }
  
  return {
    title: '操作失败',
    message: errorMessage,
    suggestion: '请稍后重试',
  };
};

/**
 * 格式化错误为显示字符串
 * @param error 用户友好的错误信息
 * @returns 格式化后的错误字符串
 */
export const formatErrorMessage = (error: UserFriendlyError): string => {
  let message = error.title;
  if (error.message && error.message !== error.title) {
    message += `\n${error.message}`;
  }
  if (error.suggestion) {
    message += `\n💡 ${error.suggestion}`;
  }
  return message;
};
