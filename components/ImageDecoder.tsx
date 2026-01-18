import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Loader2, CheckCircle2, XCircle, Image as ImageIcon, Zap } from 'lucide-react';
import { isElectronEnvironment } from '../utils/envDetection';

export function ImageDecoder() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [outputUrl, setOutputUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 自动解码开关
    const [autoDecode, setAutoDecode] = useState(() => {
        return localStorage.getItem('rh_auto_decode_enabled') === 'true';
    });

    const toggleAutoDecode = () => {
        const newValue = !autoDecode;
        setAutoDecode(newValue);
        localStorage.setItem('rh_auto_decode_enabled', String(newValue));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setOutputUrl(null);
            setStatus('idle');
            setErrorMsg('');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setOutputUrl(null);
            setStatus('idle');
            setErrorMsg('');
        }
    };

    const handleDecode = async () => {
        if (!selectedFile || !isElectronEnvironment()) return;

        setStatus('processing');
        setErrorMsg('');

        try {
            // 获取文件路径并调用 Electron API
            const arrayBuffer = await selectedFile.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            const result = await (window as any).electronAPI?.decodeImage?.(
                Array.from(uint8Array),
                selectedFile.name
            );

            if (result?.success) {
                setOutputUrl(result.outputPath);
                setStatus('success');
            } else {
                setErrorMsg(result?.error || '解码失败');
                setStatus('error');
            }
        } catch (err: any) {
            setErrorMsg(err.message || '解码失败');
            setStatus('error');
        }
    };

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full space-y-6">
                {/* 上传区域 */}
                <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${selectedFile
                        ? 'border-emerald-500/50 bg-emerald-500/5'
                        : 'border-white/20 hover:border-white/40 bg-white/5'
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    {previewUrl ? (
                        <div className="flex flex-col items-center gap-4">
                            <img src={previewUrl} alt="预览" className="max-h-48 rounded-lg object-contain" />
                            <p className="text-sm text-slate-400">{selectedFile?.name}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <Upload className="w-12 h-12 text-slate-500" />
                            <p className="text-slate-400">拖拽图片到此处或点击选择</p>
                            <p className="text-xs text-slate-500">支持包含隐藏信息的图片</p>
                        </div>
                    )}
                </div>

                {/* 解码按钮 */}
                <button
                    onClick={handleDecode}
                    disabled={!selectedFile || status === 'processing'}
                    className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${selectedFile && status !== 'processing'
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : 'bg-white/10 text-slate-500 cursor-not-allowed'
                        }`}
                >
                    {status === 'processing' ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            解码中...
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5" />
                            开始解码
                        </>
                    )}
                </button>

                {/* 状态反馈 */}
                {status === 'success' && (
                    <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-400">解码成功！文件已保存</span>
                    </div>
                )}
                {status === 'error' && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-red-400" />
                        <span className="text-red-400">{errorMsg}</span>
                    </div>
                )}

                {/* 输出预览 */}
                {outputUrl && (
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 mb-3">
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-400">解码结果</span>
                        </div>
                        <img
                            src={outputUrl}
                            alt="解码结果"
                            className="max-w-full rounded-lg"
                        />
                    </div>
                )}

                {/* 分隔线 */}
                <div className="border-t border-white/10 pt-4">
                    {/* 自动解码开关 */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">自动解码出图结果</p>
                                <p className="text-xs text-slate-500">任务完成时自动解码 SS_tools 编码的图片</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleAutoDecode}
                            className={`relative w-12 h-6 rounded-full transition-colors ${autoDecode ? 'bg-emerald-500' : 'bg-white/20'}`}
                        >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${autoDecode ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                {/* 说明 */}
                <div className="text-xs text-slate-500 space-y-1">
                    <p>• 支持解码使用 SS_tools 编码的图片</p>
                    <p>• 开启自动解码后，任务输出的图片会自动解码</p>
                </div>
            </div>
        </div>
    );
}
