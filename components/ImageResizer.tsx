import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload, X, Image as ImageIcon, Settings2, Play, Download,
  Trash2, ZoomIn, Maximize, Crop, Wand2, FileArchive, Info,
  ChevronDown, ChevronUp, Eye, Loader2, Check, AlertCircle
} from 'lucide-react';

// 类型定义
interface ImageItem {
  id: string;
  file: File;
  image: HTMLImageElement;
  name: string;
  size: number;
  width: number;
  height: number;
  previewUrl: string;
}

interface ProcessedImage {
  id: string;
  name: string;
  originalName: string;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

type AdjustMode = 'fit' | 'fill' | 'crop' | 'auto';

interface ImageResizerProps {
  className?: string;
}

const ImageResizer: React.FC<ImageResizerProps> = ({ className = '' }) => {
  // 图片状态
  const [images, setImages] = useState<ImageItem[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState<number>(-1);

  // 设置状态
  const [targetWidth, setTargetWidth] = useState(1920);
  const [targetHeight, setTargetHeight] = useState(1080);
  const [keepRatio, setKeepRatio] = useState(true);
  const [adjustMode, setAdjustMode] = useState<AdjustMode>('fit');
  const [outputFormat, setOutputFormat] = useState('image/jpeg');
  const [quality, setQuality] = useState(90);
  const [minSize, setMinSize] = useState(512);
  const [maxSize, setMaxSize] = useState(2048);

  // UI 状态
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(true);
  const [activeTab, setActiveTab] = useState<'original' | 'preview'>('original');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  // 清理 ObjectURL
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // 加载保存的设置
  useEffect(() => {
    const saved = localStorage.getItem('rh_image_resizer_settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.width) setTargetWidth(settings.width);
        if (settings.height) setTargetHeight(settings.height);
        if (settings.format) setOutputFormat(settings.format);
        if (settings.quality) setQuality(settings.quality);
        if (settings.mode) setAdjustMode(settings.mode);
        if (settings.minSize) setMinSize(settings.minSize);
        if (settings.maxSize) setMaxSize(settings.maxSize);
      } catch (e) {
        console.warn('Failed to load saved settings:', e);
      }
    }
  }, []);

  // 保存设置
  const saveSettings = useCallback(() => {
    localStorage.setItem('rh_image_resizer_settings', JSON.stringify({
      width: targetWidth,
      height: targetHeight,
      format: outputFormat,
      quality,
      mode: adjustMode,
      minSize,
      maxSize,
    }));
  }, [targetWidth, targetHeight, outputFormat, quality, adjustMode, minSize, maxSize]);

  // 添加图片
  const addImages = useCallback((files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (images.length + imageFiles.length > 5000) {
      alert('最多支持 5000 张图片');
      return;
    }

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const previewUrl = e.target?.result as string;
          objectUrlsRef.current.push(previewUrl);
          
          setImages(prev => [...prev, {
            id: crypto.randomUUID(),
            file,
            image: img,
            name: file.name,
            size: file.size,
            width: img.width,
            height: img.height,
            previewUrl,
          }]);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, [images.length]);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addImages(files);
  }, [addImages]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImages(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addImages]);

  // 删除图片
  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    if (currentPreviewIndex >= 0) {
      setCurrentPreviewIndex(-1);
    }
  }, [currentPreviewIndex]);

  // 清空所有
  const clearAll = useCallback(() => {
    setImages([]);
    setProcessedImages([]);
    setCurrentPreviewIndex(-1);
    setProcessProgress(0);
  }, []);

  // 处理单张图片
  const processImage = useCallback((img: HTMLImageElement): Omit<ProcessedImage, 'id' | 'name' | 'originalName'> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', {
      colorSpace: 'display-p3',
      desynchronized: true
    });

    if (!ctx) throw new Error('Failed to get canvas context');

    let destWidth = targetWidth;
    let destHeight = targetHeight;

    if (adjustMode === 'auto') {
      const maxEdge = Math.max(img.width, img.height);
      if (maxEdge < minSize) {
        const ratio = minSize / maxEdge;
        destWidth = Math.round(img.width * ratio);
        destHeight = Math.round(img.height * ratio);
      } else if (maxEdge > maxSize) {
        const ratio = maxSize / maxEdge;
        destWidth = Math.round(img.width * ratio);
        destHeight = Math.round(img.height * ratio);
      } else {
        destWidth = img.width;
        destHeight = img.height;
      }
      canvas.width = destWidth;
      canvas.height = destHeight;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, destWidth, destHeight);
    } else if (adjustMode === 'fit') {
      const ratio = Math.min(targetWidth / img.width, targetHeight / img.height);
      destWidth = Math.round(img.width * ratio);
      destHeight = Math.round(img.height * ratio);
      canvas.width = destWidth;
      canvas.height = destHeight;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, destWidth, destHeight);
    } else if (adjustMode === 'fill') {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      const ratio = Math.max(targetWidth / img.width, targetHeight / img.height);
      destWidth = Math.round(img.width * ratio);
      destHeight = Math.round(img.height * ratio);
      const destX = Math.round((targetWidth - destWidth) / 2);
      const destY = Math.round((targetHeight - destHeight) / 2);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, destX, destY, destWidth, destHeight);
      destWidth = targetWidth;
      destHeight = targetHeight;
    } else if (adjustMode === 'crop') {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ratio = Math.max(targetWidth / img.width, targetHeight / img.height);
      const sourceWidth = Math.round(targetWidth / ratio);
      const sourceHeight = Math.round(targetHeight / ratio);
      const sourceX = Math.round((img.width - sourceWidth) / 2);
      const sourceY = Math.round((img.height - sourceHeight) / 2);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
      destWidth = targetWidth;
      destHeight = targetHeight;
    }

    const dataUrl = canvas.toDataURL(outputFormat, quality / 100);
    const base64Length = dataUrl.split(',')[1].length;
    const size = Math.round((base64Length * 3) / 4);

    return {
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      size,
      format: outputFormat,
    };
  }, [targetWidth, targetHeight, adjustMode, outputFormat, quality, minSize, maxSize]);

  // 预览当前图片
  const previewCurrentImage = useCallback(() => {
    if (images.length === 0) return;
    const index = currentPreviewIndex >= 0 ? currentPreviewIndex : 0;
    setCurrentPreviewIndex(index);
    setActiveTab('preview');
  }, [images.length, currentPreviewIndex]);

  // 处理所有图片
  const processAllImages = useCallback(async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setProcessProgress(0);
    setProcessedImages([]);
    saveSettings();

    const results: ProcessedImage[] = [];

    for (let i = 0; i < images.length; i++) {
      const progress = ((i + 1) / images.length) * 100;
      setProcessProgress(progress);

      await new Promise(resolve => setTimeout(resolve, 50));

      try {
        const processed = processImage(images[i].image);
        results.push({
          ...processed,
          id: images[i].id,
          name: images[i].name,
          originalName: images[i].name,
        });
      } catch (e) {
        console.error('Failed to process image:', images[i].name, e);
      }
    }

    setProcessedImages(results);
    setIsProcessing(false);
  }, [images, processImage, saveSettings]);

  // 下载所有图片
  const downloadImages = useCallback(() => {
    processedImages.forEach(img => {
      const ext = img.format.split('/')[1];
      const name = img.originalName.replace(/\.[^/.]+$/, '') + `_resized.${ext}`;
      const link = document.createElement('a');
      link.href = img.dataUrl;
      link.download = name;
      link.click();
    });
  }, [processedImages]);

  // 下载 ZIP
  const downloadZip = useCallback(async () => {
    // 动态加载 JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const folder = zip.folder('processed_images');

    if (!folder) return;

    processedImages.forEach(img => {
      const ext = img.format.split('/')[1];
      const name = img.originalName.replace(/\.[^/.]+$/, '') + `_resized.${ext}`;
      const base64 = img.dataUrl.split(',')[1];
      folder.file(name, base64, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'images_processed.zip';
    link.click();
    URL.revokeObjectURL(url);
  }, [processedImages]);

  // 获取智能自动模式的操作描述
  const getAutoActionText = useCallback((img: ImageItem) => {
    const maxEdge = Math.max(img.width, img.height);
    if (maxEdge < minSize) {
      const ratio = minSize / maxEdge;
      return {
        text: `放大: ${img.width}×${img.height} → ${Math.round(img.width * ratio)}×${Math.round(img.height * ratio)}`,
        color: 'text-amber-400',
        icon: '🔼'
      };
    } else if (maxEdge > maxSize) {
      const ratio = maxSize / maxEdge;
      return {
        text: `缩小: ${img.width}×${img.height} → ${Math.round(img.width * ratio)}×${Math.round(img.height * ratio)}`,
        color: 'text-blue-400',
        icon: '🔽'
      };
    } else {
      return {
        text: '尺寸适中，保持原样',
        color: 'text-emerald-400',
        icon: '✓'
      };
    }
  }, [minSize, maxSize]);

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  // 模式选项
  const modeOptions: { mode: AdjustMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { mode: 'fit', label: '等比缩放', icon: <Maximize className="w-4 h-4" />, desc: '保持比例，适应目标尺寸' },
    { mode: 'fill', label: '填充', icon: <ZoomIn className="w-4 h-4" />, desc: '填充目标区域，可能留白' },
    { mode: 'crop', label: '裁剪', icon: <Crop className="w-4 h-4" />, desc: '裁剪到目标尺寸' },
    { mode: 'auto', label: '智能自动', icon: <Wand2 className="w-4 h-4" />, desc: '根据尺寸范围自动处理' },
  ];

  const currentPreviewImage = currentPreviewIndex >= 0 ? images[currentPreviewIndex] : null;
  const processedPreview = currentPreviewImage ? processImage(currentPreviewImage.image) : null;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 上传区域 */}
      <div className="p-4 border-b border-white/5">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${isDragging
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-white/10 hover:border-white/20 hover:bg-white/5'
            }
          `}
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-slate-500" />
          <p className="text-sm text-slate-300">点击或拖拽图片到这里</p>
          <p className="text-xs text-slate-500 mt-1">支持 JPG、PNG、WebP、GIF，最多 5000 张</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* 已上传图片列表 */}
        {images.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">已选择 {images.length} 张图片</span>
              <button
                onClick={clearAll}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                清空
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto">
              {images.slice(0, 12).map((img, index) => (
                <div
                  key={img.id}
                  className={`relative group aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    currentPreviewIndex === index ? 'border-brand-500' : 'border-transparent hover:border-white/20'
                  }`}
                  onClick={() => setCurrentPreviewIndex(index)}
                >
                  <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {images.length > 12 && (
                <div className="aspect-square rounded-lg bg-white/5 flex items-center justify-center text-xs text-slate-400">
                  +{images.length - 12}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 设置区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"
          >
            <Settings2 className="w-4 h-4" />
            调整设置
            {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showSettings && (
          <div className="space-y-4 mb-4">
            {/* 提示信息 */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>色彩管理：使用浏览器 Canvas API (P3 色域) + 高质量缩放，色彩准确度取决于浏览器支持。</span>
            </div>

            {/* 尺寸设置 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">目标宽度 (像素)</label>
                <input
                  type="number"
                  value={targetWidth}
                  onChange={(e) => setTargetWidth(parseInt(e.target.value) || 0)}
                  min={1}
                  max={10000}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">目标高度 (像素)</label>
                <input
                  type="number"
                  value={targetHeight}
                  onChange={(e) => setTargetHeight(parseInt(e.target.value) || 0)}
                  min={1}
                  max={10000}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
                />
              </div>
            </div>

            {/* 保持宽高比 */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={keepRatio}
                onChange={(e) => setKeepRatio(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/30 text-brand-500 focus:ring-brand-500/30"
              />
              <span className="text-sm text-slate-300">保持宽高比</span>
            </label>

            {/* 调整模式 */}
            <div>
              <label className="block text-xs text-slate-400 mb-2">调整模式</label>
              <div className="grid grid-cols-2 gap-2">
                {modeOptions.map(({ mode, label, icon, desc }) => (
                  <button
                    key={mode}
                    onClick={() => setAdjustMode(mode)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      adjustMode === mode
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={adjustMode === mode ? 'text-brand-400' : 'text-slate-400'}>{icon}</span>
                      <span className={`text-sm font-medium ${adjustMode === mode ? 'text-white' : 'text-slate-300'}`}>{label}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 智能自动设置 */}
            {adjustMode === 'auto' && (
              <div className="p-3 bg-white/5 rounded-lg space-y-3">
                <p className="text-xs text-slate-400">智能自动规则：</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">最小边 (像素)</label>
                    <input
                      type="number"
                      value={minSize}
                      onChange={(e) => setMinSize(parseInt(e.target.value) || 0)}
                      min={1}
                      max={10000}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">最大边 (像素)</label>
                    <input
                      type="number"
                      value={maxSize}
                      onChange={(e) => setMaxSize(parseInt(e.target.value) || 0)}
                      min={1}
                      max={10000}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  最长边 &lt; 最小边 → 放大到最小边<br />
                  最长边 &gt; 最大边 → 缩小到最大边<br />
                  最长边在范围内 → 保持原样
                </p>
              </div>
            )}

            {/* 输出格式和质量 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">输出格式</label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
                >
                  <option value="image/jpeg">JPEG</option>
                  <option value="image/png">PNG</option>
                  <option value="image/webp">WebP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">图片质量 (1-100)</label>
                <input
                  type="number"
                  value={quality}
                  onChange={(e) => setQuality(Math.min(100, Math.max(1, parseInt(e.target.value) || 90)))}
                  min={1}
                  max={100}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
                />
              </div>
            </div>
          </div>
        )}

        {/* 预览区域 */}
        {currentPreviewImage && (
          <div className="mb-4 p-4 bg-white/5 rounded-xl">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setActiveTab('original')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  activeTab === 'original' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                原图预览
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  activeTab === 'preview' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                效果预览
              </button>
            </div>

            {activeTab === 'original' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="aspect-video bg-black/30 rounded-lg overflow-hidden flex items-center justify-center">
                  <img src={currentPreviewImage.previewUrl} alt="原图" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <p><span className="text-slate-500">文件名:</span> {currentPreviewImage.name}</p>
                  <p><span className="text-slate-500">原始尺寸:</span> {currentPreviewImage.width} × {currentPreviewImage.height}</p>
                  <p><span className="text-slate-500">文件大小:</span> {formatSize(currentPreviewImage.size)}</p>
                </div>
              </div>
            ) : processedPreview && (
              <div className="grid grid-cols-2 gap-4">
                <div className="aspect-video bg-black/30 rounded-lg overflow-hidden flex items-center justify-center">
                  <img src={processedPreview.dataUrl} alt="处理后" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  {adjustMode === 'auto' && (
                    <p className={getAutoActionText(currentPreviewImage).color}>
                      {getAutoActionText(currentPreviewImage).icon} {getAutoActionText(currentPreviewImage).text}
                    </p>
                  )}
                  <p><span className="text-slate-500">目标尺寸:</span> {processedPreview.width} × {processedPreview.height}</p>
                  <p><span className="text-slate-500">估计大小:</span> {formatSize(processedPreview.size)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 处理进度 */}
        {isProcessing && (
          <div className="mb-4">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${processProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 text-center mt-2">
              处理中 {Math.round(processProgress)}%...
            </p>
          </div>
        )}

        {/* 处理结果 */}
        {processedImages.length > 0 && !isProcessing && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">处理完成</span>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <p>成功处理 {processedImages.length} 张图片</p>
              <p>原始总大小: {formatSize(images.reduce((sum, img) => sum + img.size, 0))}</p>
              <p>处理后总大小: {formatSize(processedImages.reduce((sum, img) => sum + img.size, 0))}</p>
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="p-4 border-t border-white/5 flex gap-3">
        <button
          onClick={previewCurrentImage}
          disabled={images.length === 0}
          className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-white flex items-center justify-center gap-2 transition-colors"
        >
          <Eye className="w-4 h-4" />
          预览效果
        </button>
        <button
          onClick={processAllImages}
          disabled={images.length === 0 || isProcessing}
          className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-white font-medium flex items-center justify-center gap-2 transition-colors"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {isProcessing ? '处理中...' : '处理全部'}
        </button>
      </div>

      {/* 下载按钮 */}
      {processedImages.length > 0 && !isProcessing && (
        <div className="p-4 pt-0 flex gap-3">
          <button
            onClick={downloadImages}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            下载全部
          </button>
          <button
            onClick={downloadZip}
            className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 rounded-lg text-sm text-white flex items-center justify-center gap-2 transition-colors"
          >
            <FileArchive className="w-4 h-4" />
            打包 ZIP
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageResizer;
