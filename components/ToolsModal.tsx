import React, { useState } from 'react';
import { X, ArrowLeft, Image as ImageIcon, Sparkles, Clock, Wrench, Unlock } from 'lucide-react';
import { ImageResizer } from './ImageResizer';
import { ImageDecoder } from './ImageDecoder';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 工具定义
interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType | null;
  comingSoon?: boolean;
}

const tools: Tool[] = [
  {
    id: 'image-resizer',
    name: '图片尺寸统一',
    description: '批量调整图片尺寸和格式，支持等比缩放、裁剪填充等模式',
    icon: <ImageIcon className="w-6 h-6" />,
    component: ImageResizer,
  },
  {
    id: 'image-decoder',
    name: '图片解码',
    description: '解码使用 SS_tools 编码的隐藏图片内容',
    icon: <Unlock className="w-6 h-6" />,
    component: ImageDecoder,
  },
  {
    id: 'coming-soon-1',
    name: '更多工具',
    description: '敬请期待更多实用工具...',
    icon: <Sparkles className="w-6 h-6" />,
    component: null,
    comingSoon: true,
  },
];

export function ToolsModal({ isOpen, onClose }: ToolsModalProps) {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  if (!isOpen) return null;

  const handleBack = () => setSelectedTool(null);
  const handleClose = () => {
    setSelectedTool(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 模态框内容 */}
      <div className="relative w-[95vw] max-w-5xl h-[85vh] bg-gradient-to-br from-[#1a1d24] to-[#13161b] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/10">
        {/* 头部 */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            {selectedTool && (
              <button
                onClick={handleBack}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {selectedTool ? selectedTool.name : '工具箱'}
                </h2>
                <p className="text-xs text-slate-400">
                  {selectedTool ? selectedTool.description : 'RunningHub AI 实用工具集'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden">
          {selectedTool ? (
            // 二级页面：工具详情
            <div className="h-full">
              {selectedTool.component && <selectedTool.component />}
            </div>
          ) : (
            // 一级页面：工具网格
            <div className="p-6 h-full overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => !tool.comingSoon && setSelectedTool(tool)}
                    disabled={tool.comingSoon}
                    className={`group relative p-6 rounded-xl border text-left transition-all duration-300 ${tool.comingSoon
                      ? 'bg-white/5 border-white/5 cursor-not-allowed opacity-60'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-[1.02] cursor-pointer'
                      }`}
                  >
                    {/* 图标 */}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors ${tool.comingSoon
                      ? 'bg-slate-700/50 text-slate-500'
                      : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 group-hover:from-emerald-500/30 group-hover:to-teal-500/30'
                      }`}>
                      {tool.icon}
                    </div>

                    {/* 名称和描述 */}
                    <h3 className={`text-base font-semibold mb-2 transition-colors ${tool.comingSoon ? 'text-slate-500' : 'text-white group-hover:text-emerald-300'
                      }`}>
                      {tool.name}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {tool.description}
                    </p>

                    {/* 敬请期待标签 */}
                    {tool.comingSoon && (
                      <div className="absolute top-4 right-4 flex items-center gap-1 text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" />
                        敬请期待
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
