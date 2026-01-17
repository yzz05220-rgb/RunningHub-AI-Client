import React, { useState } from 'react';
import { X, Wrench, Image, Sparkles, ChevronRight } from 'lucide-react';
import ImageResizer from './ImageResizer';

type ToolType = 'image-resizer' | null;

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ToolItem {
  id: ToolType;
  name: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
}

const tools: ToolItem[] = [
  {
    id: 'image-resizer',
    name: '图片尺寸统一',
    description: '批量调整图片尺寸，支持等比缩放、填充、裁剪、智能自动等模式',
    icon: <Image className="w-5 h-5" />,
  },
  // 未来可以添加更多工具
  // {
  //   id: 'image-compress',
  //   name: '图片压缩',
  //   description: '压缩图片文件大小，保持画质',
  //   icon: <Sparkles className="w-5 h-5" />,
  //   badge: '即将推出',
  // },
];

const ToolsModal: React.FC<ToolsModalProps> = ({ isOpen, onClose }) => {
  const [activeTool, setActiveTool] = useState<ToolType>(null);

  if (!isOpen) return null;

  const handleBack = () => {
    setActiveTool(null);
  };

  const handleClose = () => {
    setActiveTool(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl h-[85vh] bg-[#14171d] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            {activeTool ? (
              <button
                onClick={handleBack}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-400 rotate-180" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-white">
                {activeTool 
                  ? tools.find(t => t.id === activeTool)?.name || '工具'
                  : '工具箱'
                }
              </h2>
              {!activeTool && (
                <p className="text-xs text-slate-500">实用工具集合</p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden">
          {!activeTool ? (
            // 工具列表
            <div className="p-5 grid gap-3">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => tool.id && !tool.badge && setActiveTool(tool.id)}
                  disabled={!!tool.badge}
                  className={`
                    w-full p-4 rounded-xl border text-left transition-all
                    ${tool.badge
                      ? 'border-white/5 bg-white/[0.02] opacity-60 cursor-not-allowed'
                      : 'border-white/10 hover:border-brand-500/50 hover:bg-brand-500/5 cursor-pointer'
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    <div className={`
                      w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                      ${tool.badge ? 'bg-white/5 text-slate-500' : 'bg-brand-500/10 text-brand-400'}
                    `}>
                      {tool.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{tool.name}</h3>
                        {tool.badge && (
                          <span className="px-2 py-0.5 text-[10px] bg-white/10 text-slate-400 rounded-full">
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{tool.description}</p>
                    </div>
                    {!tool.badge && (
                      <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                  </div>
                </button>
              ))}

              {/* 提示信息 */}
              <div className="mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">
                      更多工具正在开发中，敬请期待！
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      如有工具需求建议，欢迎反馈
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // 具体工具内容
            <div className="h-full">
              {activeTool === 'image-resizer' && <ImageResizer />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolsModal;
