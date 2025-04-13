import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntApp } from 'antd';
import App from './App';
import './styles/global.css';

async function initApp() {
    try {
        // 确保 Tauri API 可用
        if (window.__TAURI__) {
            await import('@tauri-apps/api');
        }

        const root = ReactDOM.createRoot(
            document.getElementById('root') as HTMLElement
        );

        root.render(
            <React.StrictMode>
                <ConfigProvider>
                    <AntApp>
                        <App />
                    </AntApp>
                </ConfigProvider>
            </React.StrictMode>
        );
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
}

initApp();
