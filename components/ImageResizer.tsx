import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Settings, Image as ImageIcon, X, Loader2, Package } from 'lucide-react';
import JSZip from 'jszip';

type ResizeMode = 'contain' | 'cover' | 'fill' | 'auto';
type OutputFormat = 'jpeg' | 'png' | 'webp';

interface ProcessedImage {
  name: string;
  original: string;
  processed: string;
  originalSize: number;
  processedSize: number;
}

export function ImageResizer() {
  const [images, setImages] = useState<File[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // 设置
  const [targetWidth, setTargetWidth] = useState(800);
  const [targetHeight, setTargetHeight] = useState(600);
  const [resizeMode, setResizeMode] = useState<ResizeMode>('contain');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpeg');
  const [quality, setQuality] = useState(85);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...files]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/'));
    setImages(prev => [...prev, ...files]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const processImages = async () => {
    if (images.length === 0) return;
    
    setProcessing(true);
    setProgress(0);
    const results: ProcessedImage[] = [];

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const processed = await processImage(file);
      if (processed) {
        results.push(processed);
      }
      setProgress(((i + 1) / images.length) * 100);
    }

    setProcessedImages(results);
    setProcessing(false);
  };

  const processImage = async (file: File): Promise<ProcessedImage | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        let { width, height, offsetX, offsetY } = calculateDimensions(
          img.width,
          img.height,
          targetWidth,
          targetHeight,
          resizeMode
        );

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // 填充背景色（白色）
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制图片
        ctx.drawImage(img, offsetX, offsetY, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve({
                name: file.name,
                original: URL.createObjectURL(file),
                processed: url,
                originalSize: file.size,
                processedSize: blob.size,
              });
            } else {
              resolve(null);
            }
          },
          `image/${outputFormat}`,
          quality / 100
        );
      };

      reader.readAsDataURL(file);
    });
  };

  const calculateDimensions = (
    imgWidth: number,
    imgHeight: number,
    targetW: number,
    targetH: number,
    mode: ResizeMode
  ) => {
    let width = targetW;
    let height = targetH;
    let offsetX = 0;
    let offsetY = 0;

    const imgRatio = imgWidth / imgHeight;
    const targetRatio = targetW / targetH;

    switch (mode) {
      case 'contain':
        if (imgRatio > targetRatio) {
          height = targetW / imgRatio;
          offsetY = (targetH - height) / 2;
        } else {
          width = targetH * imgRatio;
          offsetX = (targetW - width) / 2;
        }
        break;
      case 'cover':
        if (imgRatio > targetRatio) {
          width = targetH * imgRatio;
          offsetX = (targetW - width) / 2;
        } else {
          height = targetW / imgRatio;
          offsetY = (targetH - height) / 2;
        }
        break;
      case 'fill':
        // 拉伸填充
        break;
      case 'auto':
        // 智能模式：如果图片比目标小，保持原尺寸居中
        if (imgWidth <= targetW && imgHeight <= targetH) {
          width = imgWidth;
          height = imgHeight;
          offsetX = (targetW - width) / 2;
          offsetY = (targetH - height) / 2;
        } else {
          // 否则使用 contain 模式
          if (imgRatio > targetRatio) {
            height = targetW / imgRatio;
            offsetY = (targetH - height) / 2;
          } else {
            width = targetH * imgRatio;
            offsetX = (targetW - width) / 2;
          }
        }
        break;
    }

    return { width, height, offsetX, offsetY };
  };

  const downloadSingle = (processed: ProcessedImage) => {
    const a = document.createElement('a');
    a.href = processed.processed;
    a.download = `resized_${processed.name.replace(/\.[^.]+$/, '')}.${outputFormat}`;
    a.click();
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    
    for (const img of processedImages) {
      const response = await fetch(img.processed);
      const blob = await response.blob();
      zip.file(`resized_${img.name.replace(/\.[^.]+$/, '')}.${outputFormat}`, blob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resized_images.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    processedImages.forEach(img => {
      URL.revokeObjectURL(img.original);
      URL.revokeObjectURL(img.processed);
    });
    setImages([]);
    setProcessedImages([]);
    setProgress(0);
  };

  return (
    <div className="h-full flex flex-col bg-[#14171d] text-white">
      {/* 头部 */}
      <div className="flex-shrink-0 p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center">
              <ImageIcon className="text-brand-500" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">图片尺寸统一</h2>
              <p className="text-sm text-white/60">批量调整图片尺寸和格式</p>
            </div>
          </div>
          {images.length > 0 && (
            <button
              onClick={clearAll}
              className="px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              清空全部
            </button>
          )}
        </div>

        {/* 设置面板 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/5 rounded-lg">
          <div>
            <label className="block text-sm text-white/60 mb-2">宽度</label>
            <input
              type="number"
              value={targetWidth}
              onChange={(e) => setTargetWidth(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">高度</label>
            <input
              type="number"
              value={targetHeight}
              onChange={(e) => setTargetHeight(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">调整模式</label>
            <select
              value={resizeMode}
              onChange={(e) => setResizeMode(e.target.value as ResizeMode)}
              className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white"
            >
              <option value="contain">等比缩放</option>
              <option value="cover">填充裁剪</option>
              <option value="fill">拉伸填充</option>
              <option value="auto">智能自动</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">输出格式</label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
              className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white"
            >
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-white/60 mb-2">质量: {quality}%</label>
            <input
              type="range"
              min="1"
              max="100"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* 上传区域 */}
      {images.length === 0 ? (
        <div
          className="flex-1 flex items-center justify-center p-6"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <Upload className="text-white/40" size={32} />
            </div>
            <h3 className="text-lg font-medium mb-2">上传图片</h3>
            <p className="text-sm text-white/60 mb-4">拖拽图片到此处，或点击按钮选择文件</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
            >
              选择文件
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 操作栏 */}
          <div className="flex-shrink-0 p-4 border-b border-white/10 flex items-center justify-between">
            <div className="text-sm text-white/60">
              已选择 {images.length} 张图片
              {processedImages.length > 0 && ` · 已处理 ${processedImages.length} 张`}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                添加更多
              </button>
              <button
                onClick={processImages}
                disabled={processing}
                className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    处理中...
                  </>
                ) : (
                  <>
                    <Settings size={16} />
                    开始处理
                  </>
                )}
              </button>
              {processedImages.length > 0 && (
                <button
                  onClick={downloadAll}
                  className="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Package size={16} />
                  打包下载
                </button>
              )}
            </div>
          </div>

          {/* 进度条 */}
          {processing && (
            <div className="flex-shrink-0 px-4 py-2 bg-white/5">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* 图片列表 */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {processedImages.map((img, index) => (
                <div key={index} className="bg-white/5 rounded-lg overflow-hidden">
                  <div className="aspect-square bg-white/10 flex items-center justify-center">
                    <img
                      src={img.processed}
                      alt={img.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate mb-2">{img.name}</p>
                    <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                      <span>{(img.originalSize / 1024).toFixed(1)} KB</span>
                      <span>→</span>
                      <span>{(img.processedSize / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                      onClick={() => downloadSingle(img)}
                      className="w-full px-3 py-1.5 text-sm bg-brand-500 hover:bg-brand-600 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <Download size={14} />
                      下载
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
