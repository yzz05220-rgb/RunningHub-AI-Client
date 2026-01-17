import React, { useState, useEffect } from 'react';
import { Key, Check, X, Loader2, Eye, EyeOff, Coins, Activity } from 'lucide-react';
import { useApiKeyValidation } from '../hooks/useApiKeyValidation';

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean | null) => void;
  autoValidate?: boolean;
  showAccountInfo?: boolean;
  className?: string;
  placeholder?: string;
  label?: string;
}

/**
 * API Key 输入组件
 * 支持实时验证、密码显示切换、账户信息展示
 */
const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  value,
  onChange,
  onValidationChange,
  autoValidate = true,
  showAccountInfo = true,
  className = '',
  placeholder = 'sk-...',
  label = 'API Key',
}) => {
  const [showKey, setShowKey] = useState(false);
  const { isValid, isValidating, accountInfo, error, validate } = useApiKeyValidation(
    autoValidate ? value : '',
    autoValidate ? 800 : 0
  );

  // 通知父组件验证状态变化
  useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  // 手动验证
  const handleManualValidate = () => {
    if (value.trim()) {
      validate(value);
    }
  };

  // 获取验证状态指示器
  const getStatusIndicator = () => {
    if (isValidating) {
      return <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />;
    }
    if (isValid === true) {
      return <Check className="w-4 h-4 text-emerald-400" />;
    }
    if (isValid === false) {
      return <X className="w-4 h-4 text-red-400" />;
    }
    return null;
  };

  return (
    <div className={className}>
      {/* 标签 */}
      {label && (
        <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
          <Key className="h-3 w-3" />
          {label}
        </label>
      )}

      {/* 输入框 */}
      <div className="relative">
        <input
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`
            block w-full px-3 py-2.5 pr-20 text-sm 
            bg-black/20 border rounded-lg 
            focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 
            transition-all outline-none text-white placeholder:text-slate-500 
            ${isValid === false ? 'border-red-500/50' : isValid === true ? 'border-emerald-500/50' : 'border-white/10'}
          `}
          placeholder={placeholder}
        />

        {/* 右侧操作区 */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* 验证状态 */}
          {getStatusIndicator()}

          {/* 显示/隐藏切换 */}
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* 手动验证按钮（当自动验证关闭时） */}
          {!autoValidate && value.trim() && (
            <button
              type="button"
              onClick={handleManualValidate}
              disabled={isValidating}
              className="px-2 py-1 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded transition-colors disabled:opacity-50"
            >
              验证
            </button>
          )}
        </div>
      </div>

      {/* 错误信息 */}
      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}

      {/* 账户信息 */}
      {showAccountInfo && isValid && accountInfo && (
        <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Coins className="w-3.5 h-3.5" />
              <span>余额: {accountInfo.remainCoins} 积分</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Activity className="w-3.5 h-3.5" />
              <span>运行中: {accountInfo.currentTaskCounts} 任务</span>
            </div>
          </div>
        </div>
      )}

      {/* 验证成功但无详细信息时的简单提示 */}
      {isValid && !accountInfo && !showAccountInfo && (
        <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1">
          <Check className="w-3 h-3" />
          API Key 有效
        </p>
      )}
    </div>
  );
};

export default ApiKeyInput;
