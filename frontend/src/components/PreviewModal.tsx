import React, { useState, useEffect } from 'react';
import { Modal, Typography, Spin } from 'antd';
import { invoke } from '@tauri-apps/api/tauri';

const { Text } = Typography;

interface PreviewModalProps {
    visible: boolean;
    filePath: string;
    searchQuery?: string;
    onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
    visible,
    filePath,
    searchQuery,
    onClose,
}) => {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [highlightedContent, setHighlightedContent] = useState<string>('');

    useEffect(() => {
        if (visible && filePath) {
            setLoading(true);
            invoke('preview_file', { path: filePath })
                .then((result: string) => {
                    setContent(result);
                    if (searchQuery) {
                        invoke('highlight_content', {
                            content: result,
                            query: searchQuery,
                        }).then((highlighted: string) => {
                            setHighlightedContent(highlighted);
                        });
                    }
                })
                .catch((error) => {
                    console.error('Error previewing file:', error);
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [visible, filePath, searchQuery]);

    return (
        <Modal
            title="文件预览"
            open={visible}
            onCancel={onClose}
            footer={null}
            width={800}
        >
            <div className="preview-content">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Spin size="large" />
                    </div>
                ) : (
                    <div className="whitespace-pre-wrap font-mono text-sm">
                        {searchQuery && highlightedContent ? (
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: highlightedContent,
                                }}
                            />
                        ) : (
                            <Text>{content}</Text>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default PreviewModal; 