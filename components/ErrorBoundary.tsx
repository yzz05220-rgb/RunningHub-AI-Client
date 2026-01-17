import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Proactively update state so next render shows fallback UI.
        return { hasError: true, error: error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });

        // Attempt to log to main process if possible
        if ((window as any).electronAPI) {
            // We can implement a log method exposed via preload later, 
            // but showing it on screen is the priority.
        }
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', color: '#ff6b6b', backgroundColor: '#1a1a1a', height: '100vh', overflow: 'auto', fontFamily: 'monospace' }}>
                    <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>⚠️ 客户端发生错误 (Client Error)</h1>
                    <p style={{ marginBottom: '10px' }}>应用程序遇到了渲染错误，为了防止崩溃已显示此页面。</p>

                    <div style={{ backgroundColor: '#000', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                        <strong style={{ display: 'block', marginBottom: '10px', color: '#fff' }}>{this.state.error?.toString()}</strong>
                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: '#888' }}>
                            {this.state.errorInfo?.componentStack}
                        </pre>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#339af0',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        重新加载应用 (Reload)
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
