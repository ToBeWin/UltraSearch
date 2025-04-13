import React, { useState } from 'react';
import { Input, Table, Space, Typography, Card, Tabs, Button } from 'antd';
import { SearchOutlined, FileOutlined, EyeOutlined } from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/tauri';
import dayjs from 'dayjs';
import PreviewModal from '../components/PreviewModal';

const { Title } = Typography;

interface SearchResult {
    path: string;
    name: string;
    extension: string | null;
    size: number;
    modified: string;
    is_dir: boolean;
}

const SearchPage: React.FC = () => {
    const [searchType, setSearchType] = useState('name');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [selectedFile, setSelectedFile] = useState<SearchResult | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = async (value: string) => {
        if (!value) return;
        
        setSearchQuery(value);
        setLoading(true);
        try {
            let searchResults: SearchResult[] = [];
            
            switch (searchType) {
                case 'name':
                    searchResults = await invoke('search_by_name', { query: value });
                    break;
                case 'extension':
                    searchResults = await invoke('search_by_extension', { extension: value });
                    break;
                case 'content':
                    searchResults = await invoke('search_by_content', { query: value });
                    break;
            }
            
            setResults(searchResults);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = (record: SearchResult) => {
        setSelectedFile(record);
        setPreviewVisible(true);
    };

    const columns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: SearchResult) => (
                <Space>
                    <FileOutlined />
                    <span>{text}</span>
                </Space>
            ),
        },
        {
            title: '路径',
            dataIndex: 'path',
            key: 'path',
        },
        {
            title: '大小',
            dataIndex: 'size',
            key: 'size',
            render: (size: number) => `${(size / 1024).toFixed(2)} KB`,
        },
        {
            title: '修改时间',
            dataIndex: 'modified',
            key: 'modified',
            render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: SearchResult) => (
                <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => handlePreview(record)}
                >
                    预览
                </Button>
            ),
        },
    ];

    const tabItems = [
        {
            key: 'name',
            label: '文件名搜索',
            children: (
                <Input.Search
                    placeholder="输入文件名"
                    onSearch={handleSearch}
                    loading={loading}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            key: 'extension',
            label: '文件类型搜索',
            children: (
                <Input.Search
                    placeholder="输入文件扩展名"
                    onSearch={handleSearch}
                    loading={loading}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            key: 'content',
            label: '内容搜索',
            children: (
                <Input.Search
                    placeholder="输入搜索内容"
                    onSearch={handleSearch}
                    loading={loading}
                    style={{ width: '100%' }}
                />
            ),
        },
    ];

    return (
        <div className="p-4">
            <Title level={2}>文件搜索</Title>
            <Card>
                <Tabs
                    activeKey={searchType}
                    onChange={setSearchType}
                    items={tabItems}
                />
                <Table
                    dataSource={results}
                    columns={columns}
                    loading={loading}
                    rowKey="path"
                    pagination={{ pageSize: 10 }}
                />
            </Card>
            {selectedFile && (
                <PreviewModal
                    visible={previewVisible}
                    filePath={selectedFile.path}
                    searchQuery={searchQuery}
                    onClose={() => {
                        setPreviewVisible(false);
                        setSelectedFile(null);
                    }}
                />
            )}
        </div>
    );
};

export default SearchPage; 