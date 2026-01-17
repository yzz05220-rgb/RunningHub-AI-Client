import React, { useEffect, useRef, useState } from 'react';
import { CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { isWebEnvironment } from '../utils/envDetection';

interface PayPalButtonProps {
    className?: string;
}

/**
 * PayPal 支付按钮组件
 * 使用 PayPal Buttons SDK 实现完整的支付流程
 */
export const PayPalButton: React.FC<PayPalButtonProps> = ({ className = '' }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isInitialized = useRef(false);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

    useEffect(() => {
        // 仅在 Web 环境且未初始化时加载 PayPal
        if (!isWebEnvironment() || isInitialized.current) {
            return;
        }

        // 检查 PayPal SDK 是否已加载
        if (typeof (window as any).paypal === 'undefined') {
            console.warn('PayPal SDK not loaded. Make sure to include the script in index.html for Web builds.');
            return;
        }

        // 渲染 PayPal Buttons
        try {
            (window as any).paypal.Buttons({
                style: {
                    layout: 'vertical',
                    color: 'gold',
                    shape: 'rect',
                    label: 'paypal'
                },

                // 创建订单
                createOrder: function (data: any, actions: any) {
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                value: '2.00', // 捐赠金额
                                currency_code: 'USD'
                            },
                            description: '支持 RunningHub AI Client 开发'
                        }]
                    });
                },

                // 支付成功回调
                onApprove: function (data: any, actions: any) {
                    return actions.order.capture().then(function (details: any) {
                        console.log('Payment successful:', details);
                        setPaymentStatus('success');

                        // 3秒后重置状态
                        setTimeout(() => {
                            setPaymentStatus('idle');
                        }, 5000);
                    });
                },

                // 支付取消
                onCancel: function (data: any) {
                    console.log('Payment cancelled:', data);
                    setErrorMessage('支付已取消');
                    setPaymentStatus('error');
                    setTimeout(() => {
                        setPaymentStatus('idle');
                        setErrorMessage('');
                    }, 3000);
                },

                // 支付错误
                onError: function (err: any) {
                    console.error('Payment error:', err);
                    setErrorMessage('支付过程出错，请稍后重试');
                    setPaymentStatus('error');
                    setTimeout(() => {
                        setPaymentStatus('idle');
                        setErrorMessage('');
                    }, 3000);
                }
            }).render('#paypal-button-container');

            isInitialized.current = true;
            console.log('PayPal Buttons initialized successfully');
        } catch (error) {
            console.error('Failed to initialize PayPal Buttons:', error);
            setErrorMessage('PayPal 初始化失败');
            setPaymentStatus('error');
        }
    }, []);

    // 如果不是 Web 环境，不渲染任何内容
    if (!isWebEnvironment()) {
        return null;
    }

    return (
        <div className={`paypal-button-wrapper ${className}`}>
            <div className="mb-4 flex items-center gap-2 text-slate-300">
                <CreditCard className="w-5 h-5" />
                <span className="font-medium">支持开发者</span>
            </div>

            {/* PayPal Buttons Container */}
            <div
                id="paypal-button-container"
                ref={containerRef}
                className="bg-slate-800/50 rounded-lg p-4 border border-white/10 min-h-[120px]"
            />

            {/* Success Message */}
            {paymentStatus === 'success' && (
                <div className="mt-3 flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">感谢您的支持！</span>
                </div>
            )}

            {/* Error Message */}
            {paymentStatus === 'error' && (
                <div className="mt-3 flex items-center gap-2 text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm">{errorMessage || '支付失败'}</span>
                </div>
            )}

            {/* Info Text */}
            {paymentStatus === 'idle' && (
                <p className="mt-3 text-xs text-slate-400 text-center">
                    通过 PayPal 安全支付，支持项目持续开发
                </p>
            )}
        </div>
    );
};
