// components/FileList.tsx
import React, { useEffect, useState } from 'react';
import { Pagination, Spin } from 'antd';
import { FixedSizeList as ListWindow } from 'react-window';

interface File {
    id: number;
    name: string;
    path: string;
}

interface FileListProps {
    results: File[];
    loading: boolean;
}

const FileList: React.FC<FileListProps> = ({ results, loading }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20); // 每页20个文件
    const [currentFiles, setCurrentFiles] = useState<File[]>([]);

    useEffect(() => {
        // 根据当前页和每页大小，更新展示的文件
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        setCurrentFiles(results.slice(start, end));
    }, [currentPage, results]);

    // 渲染每行文件数据
    const renderRow = ({ index, style }: { index: number; style: React.CSSProperties }) => (
        <div style={style} className="flex justify-between p-2 border-b border-gray-700">
            <span className="text-white">{currentFiles[index]?.name}</span>
            <span className="text-gray-400">{currentFiles[index]?.path}</span>
        </div>
    );

    return (
        <div className="space-y-4">
            {loading ? (
                <Spin className="w-full flex justify-center" />
            ) : (
                <>
                    <div style={{ height: '400px', width: '100%' }}>
                        <ListWindow
                            height={400}
                            itemCount={currentFiles.length}
                            itemSize={50} // 每行高度
                            width="100%"
                        >
                            {renderRow}
                        </ListWindow>
                    </div>
                    <Pagination
                        current={currentPage}
                        total={results.length}
                        pageSize={pageSize}
                        onChange={setCurrentPage}
                        showSizeChanger={false}
                        className="flex justify-center my-4"
                    />
                </>
            )}
        </div>
    );
};

export default FileList;
