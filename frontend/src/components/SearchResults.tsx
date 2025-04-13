import React, { useEffect } from 'react';
import { Table, Typography, Tooltip, Button, Empty, Space, message } from 'antd';
import { FileOutlined, CopyOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { open } from '@tauri-apps/plugin-shell';
// 使用 JavaScript 内置方法替代 Tauri path API
// import { dirname } from '@tauri-apps/api/path';

const { Text } = Typography;

interface SearchResult {
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

interface SearchResultsProps {
    results: SearchResult[];
    loading: boolean;
}

// 自己实现获取目录路径的函数
function getDirectoryPath(filePath: string): string {
    // 处理 Windows 路径
    if (filePath.includes('\\')) {
        const lastBackslashIndex = filePath.lastIndexOf('\\');
        return filePath.substring(0, lastBackslashIndex);
    }
    
    // 处理 Unix/Linux 路径
    const lastSlashIndex = filePath.lastIndexOf('/');
    return lastSlashIndex !== -1 ? filePath.substring(0, lastSlashIndex) : filePath;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, loading }) => {
    const { t } = useTranslation();
    const [messageApi, contextHolder] = message.useMessage();
    
    // 调试用，检查数据是否正确
    useEffect(() => {
        if (results.length > 0) {
            console.log('Search results sample:', results[0]);
        }
    }, [results]);

    const getFileIcon = (_type: string) => {
        return <FileOutlined />;
    };

    const formatFileSize = (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    };

    const openFileLocation = async (path: string) => {
        if (!path) {
            console.error('Cannot open location: path is empty or undefined');
            messageApi.error(t('无效文件路径'));
            return;
        }
        
        console.log('Attempting to open location for path:', path);
        try {
            // 使用自己实现的函数获取目录路径
            const dir = getDirectoryPath(path);
            console.log('Directory to open:', dir);
            await open(dir);
            messageApi.success(t('已打开文件位置'));
        } catch (error) {
            console.error('Failed to open file location:', error);
            messageApi.error(t('打开文件位置失败'));
        }
    };

    const copyFilePath = async (path: string) => {
        if (!path) {
            console.error('Cannot copy: path is empty or undefined');
            messageApi.error(t('无效文件路径'));
            return;
        }
        
        console.log('Attempting to copy path:', path);
        try {
            // 尝试使用现代 Web API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(path);
                messageApi.success(t('文件路径已复制'));
                return;
            }
            
            // 备用方法：创建临时文本区域
            const textArea = document.createElement('textarea');
            textArea.value = path;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                messageApi.success(t('文件路径已复制'));
            } else {
                throw new Error('备用复制方法失败');
            }
        } catch (error) {
            console.error('Failed to copy file path:', error);
            messageApi.error(t('复制文件路径失败'));
        }
    };

    const columns = [
        {
            title: t('文件名'),
            dataIndex: 'name',
            key: 'name',
            width: '22%',
            className: 'filename-column',
            ellipsis: {
                showTitle: false,
            },
            render: (text: string, record: SearchResult) => (
                <Tooltip placement="topLeft" title={text || t('未知')} key={`name-${record.path}`} className="filename-tooltip">
                    <div className="flex items-center">
                        {getFileIcon(record.type)}
                        <Text style={{ marginLeft: 8 }} ellipsis>
                            {text || t('未知')}
                        </Text>
                    </div>
                </Tooltip>
            ),
        },
        {
            title: t('文件路径'),
            dataIndex: 'path',
            key: 'path',
            width: '30%',
            className: 'filepath-column',
            ellipsis: {
                showTitle: false,
            },
            render: (text: string, record: SearchResult) => {
                // 确保路径存在
                const path = text || '';
                return (
                    <div className="flex items-center justify-between" key={`path-${record.path}`}>
                        <Tooltip placement="topLeft" title={path} className="filepath-tooltip">
                            <Text ellipsis style={{ maxWidth: 'calc(100% - 32px)' }}>
                                {path || t('路径不可用')}
                            </Text>
                        </Tooltip>
                        <Tooltip title={t('复制路径')}>
                            <Button
                                type="text"
                                icon={<CopyOutlined />}
                                size="small"
                                className="flex-shrink-0"
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (path) copyFilePath(path); 
                                }}
                                aria-label={t('复制路径')}
                                disabled={!path}
                            />
                        </Tooltip>
                    </div>
                );
            },
        },
        {
            title: t('文件大小'),
            dataIndex: 'size',
            key: 'size',
            width: '15%',
            className: 'size-column',
            render: (size: number, record: SearchResult) => (
                <span key={`size-${record.path}`}>{formatFileSize(size)}</span>
            ),
        },
        {
            title: t('修改时间'),
            dataIndex: 'modifiedTime',
            key: 'modifiedTime',
            width: '18%',
            className: 'date-column',
            render: (timestamp: number, record: SearchResult) => (
                <span key={`time-${record.path}`}>
                    {timestamp ? dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm') : 'N/A'}
                </span>
            ),
        },
        {
            title: t('操作'),
            key: 'action',
            width: '15%',
            className: 'actions-column',
            render: (_: any, record: SearchResult) => {
                const path = record.path || '';
                return (
                    <Space key={`action-${record.path}`}>
                        <Button
                            type="link"
                            size="small"
                            icon={<FolderOpenOutlined />}
                            onClick={() => path && openFileLocation(path)}
                            aria-label={t('打开位置')}
                            disabled={!path}
                        >
                            {t('打开位置')}
                        </Button>
                    </Space>
                );
            },
        },
    ];

    // 只在加载中或有数据时渲染表格
    return (
        <div className="search-results">
            {contextHolder}
            {/* 始终显示表格，但在没有结果时使用Empty组件 */}
            <Table
                columns={columns}
                dataSource={results.map(item => ({ ...item, key: item.path || Math.random().toString() }))}
                loading={loading}
                rowKey={record => record.path || Math.random().toString()}
                size="small"
                locale={{ emptyText: <Empty description={t('暂无搜索结果')} /> }}
                pagination={results.length > 10 ? { 
                    defaultPageSize: 10, 
                    showSizeChanger: true, 
                    size: 'small', 
                    showTotal: (total) => t('共 {{total}} 条结果', { total }) 
                } : false}
                className="search-results-table"
            />
        </div>
    );
};

export default SearchResults; 