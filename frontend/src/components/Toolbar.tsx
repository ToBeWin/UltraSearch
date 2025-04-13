import React from 'react';
import { Button, Tooltip } from 'antd';
import { ReloadOutlined, DownloadOutlined, StarOutlined, SettingOutlined } from '@ant-design/icons';

const Toolbar: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
    return (
        <div className="mb-4 flex gap-2 justify-end">
            <Tooltip title="收藏当前结果">
                <Button icon={<StarOutlined />} size="middle" type="default" className="rounded-xl" />
            </Tooltip>
            <Tooltip title="导出结果为CSV">
                <Button icon={<DownloadOutlined />} size="middle" type="default" className="rounded-xl" />
            </Tooltip>
            <Tooltip title="刷新索引">
                <Button icon={<ReloadOutlined />} size="middle" type="default" className="rounded-xl" />
            </Tooltip>
            <Tooltip title="设置">
                <Button icon={<SettingOutlined />} size="middle" type="default" onClick={onOpenSettings} className="rounded-xl" />
            </Tooltip>
        </div>
    );
};

export default Toolbar;