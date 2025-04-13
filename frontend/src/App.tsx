import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, message } from 'antd';
import { SearchOutlined, CodeOutlined } from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import BasicSearch from './components/BasicSearch';
import AdvancedSearch from './components/AdvancedSearch';
import SearchResults from './components/SearchResults';
import AppLayout from './components/Layout/AppLayout';
import './i18n';
import { useTranslation } from 'react-i18next';

interface SearchResultUI {
    path: string;
    name: string;
    type: string;
    size: number;
    modifiedTime: number;
    matches?: {
        line: number;
        content: string;
    }[];
}

interface FileMetadataBackend {
    file_path: string;
    name: string;
    size: number;
    modified_time: number;
    line_number?: number;
    content?: string;
    matches?: string[];
}

const App: React.FC = () => {
    const [searchResults, setSearchResults] = useState<SearchResultUI[]>([]);
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();
    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        const hideLoading = messageApi.loading(t('正在初始化...'), 0);

        invoke('scan_directory')
            .then(() => {
                messageApi.success(t('后台扫描已启动'), 2.5);
            })
            .catch(error => {
                console.error('Failed to trigger initial scan:', error);
                messageApi.error(t('启动后台扫描失败'), 3);
            })
            .finally(() => {
                hideLoading();
            });
    }, [messageApi, t]);

    const handleBasicSearch = useCallback(async (query: string) => {
        if (!query.trim()) { messageApi.warning(t('请输入文件名或路径关键字')); return; }
        setSearchResults([]);
        setLoading(true);
        try {
             console.log('Sending basic search query:', query);
             const results = await invoke<FileMetadataBackend[]>('basic_search', { query });
             console.log('Search results received:', results);
             
             const transformed = results.map(r => ({ 
                path: r.file_path,
                name: r.name, 
                type: 'unknown', 
                size: r.size, 
                modifiedTime: r.modified_time 
             }));
             
             console.log('Transformed results:', transformed);
             setSearchResults(transformed);
             if (results.length === 0) { messageApi.info(t('未找到匹配的结果')); }
         } catch (error) { console.error('Search error:', error); messageApi.error(t('搜索失败，请重试')); }
         finally { setLoading(false); }
    }, [t, messageApi]);

    const handleAdvancedSearch = useCallback(async (values: any) => {
        const query = values.query || values.name || '';
        const filters = {
            file_type: values.fileType || null,
            min_size: values.minSize || null,
            max_size: values.maxSize || null,
        };

        if (!query.trim() && !filters.file_type && filters.min_size === null && filters.max_size === null) {
            messageApi.warning(t('请输入至少一个搜索条件'));
            return;
        }
        setSearchResults([]);
        setLoading(true);
        try {
            console.log('Sending advanced search query:', { query, filters });
            const results = await invoke<FileMetadataBackend[]>('advanced_search', { query, filters });
            console.log('Advanced search results received:', results);
            
            const transformed = results.map(r => ({ 
                path: r.file_path,
                name: r.name, 
                type: 'unknown', 
                size: r.size, 
                modifiedTime: r.modified_time 
            }));
            
            console.log('Transformed results:', transformed);
            setSearchResults(transformed);
            if (results.length === 0) { messageApi.info(t('未找到匹配的结果')); }
        } catch (error) { console.error('Advanced search error:', error); messageApi.error(t('高级搜索失败，请重试')); }
        finally { setLoading(false); }
    }, [t, messageApi]);

    const items = [
        {
            key: '1',
            label: ( <span> <SearchOutlined /> {t('快速搜索')} </span> ),
            children: ( <BasicSearch onSearch={handleBasicSearch} placeholder={t('输入文件名或路径关键字...')} /> ),
        },
        {
            key: '2',
            label: ( <span> <CodeOutlined /> {t('高级搜索')} </span> ),
            children: ( <AdvancedSearch onSearch={handleAdvancedSearch} /> ),
        },
    ];

    return (
        <>
            {contextHolder}
            <AppLayout>
                <div className="content-container">
                    <Tabs defaultActiveKey="1" items={items} className="search-tabs" />
                    <SearchResults results={searchResults} loading={loading} />
                </div>
            </AppLayout>
        </>
    );
};

export default App;

