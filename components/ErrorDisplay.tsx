import React from 'react';
import { AlertTriangle, AlertCircle, XCircle, Info, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { UserFriendlyError } from '../types';

interface ErrorDisplayProps {
  error: UserFriendlyError | string;
  variant?: 'inline' | 'card' | 'toast';
  showDetails?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * 统一的错误展示组件
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  variant = 'inline',
  showDetails = false,
  onRetry,
  onDismiss,
  className = '',
}) => {
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);

  // 标准化错误对象
  const errorObj: UserFriendlyError = typeof error === 'string'
    ? { title: '操作失败', message: error }
    : error;

  // 根据错误类型选择图标
  const getIcon = () => {
    const title = errorObj.title.toLowerCase();
    if (title.includes('网络') || title.includes('超时')) {
      return <AlertCircle className="w-4 h-4" />;
    }
    if (title.includes('权限') || title.includes('无效')) {
      return <XCircle className="w-4 h-4" />;
    }
    if (title.includes('提示') || title.includes('注意')) {
      return <Info className="w-4 h-4" />;
    }
    return <AlertTriangle className="w-4 h-4" />;
  };

  // 内联样式
  if (variant === 'inline') {
    return (
      <div className={`flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg ${className}`}>
        <div className="text-red-400 shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-400">{errorObj.title}</p>
          {errorObj.message && errorObj.message !== errorObj.title && (
            <p className="text-xs text-red-300/80 mt-0.5">{errorObj.message}</p>
          )}
          {errorObj.suggestion && (
            <p className="text-xs text-slate-400 mt-1">💡 {errorObj.suggestion}</p>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
            title="重试"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // 卡片样式
  if (variant === 'card') {
    return (
      <div className={`bg-slate-800/50 border border-red-500/30 rounded-xl overflow-hidden ${className}`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-semibold text-white">{errorObj.title}</h4>
              {errorObj.message && errorObj.message !== errorObj.title && (
                <p className="text-sm text-slate-400 mt-1">{errorObj.message}</p>
              )}
              {errorObj.suggestion && (
                <div className="mt-3 p-2 bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-300">💡 {errorObj.suggestion}</p>
                </div>
              )}
            </div>
          </div>

          {/* 详细错误信息（可展开） */}
          {showDetails && errorObj.originalError && (
            <div className="mt-3">
              <button
                onClick={() => setDetailsExpanded(!detailsExpanded)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400"
              >
                {detailsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {detailsExpanded ? '收起详情' : '查看详情'}
              </button>
              {detailsExpanded && (
                <pre className="mt-2 p-2 bg-black/30 rounded text-[10px] text-slate-500 overflow-x-auto max-h-32">
                  {errorObj.originalError}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {(onRetry || onDismiss) && (
          <div className="px-4 py-3 bg-slate-900/50 border-t border-white/5 flex justify-end gap-2">
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                关闭
              </button>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                重试
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Toast 样式
  return (
    <div className={`flex items-center gap-3 p-3 bg-slate-800 border border-red-500/30 rounded-lg shadow-lg ${className}`}>
      <div className="text-red-400 shrink-0">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{errorObj.title}</p>
        {errorObj.suggestion && (
          <p className="text-xs text-slate-400 mt-0.5">{errorObj.suggestion}</p>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 text-slate-500 hover:text-white transition-colors"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default ErrorDisplay;
