import * as React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface BasicSearchProps {
    onSearch: (value: string) => void;
}

const BasicSearch: React.FC<BasicSearchProps> = ({ onSearch }) => {
    const { t } = useTranslation();

    return (
        <div className="search-wrapper">
            <div className="space-y-6">
                <div className="basic-search-container">
                    <Input.Search
                        placeholder={t('输入关键词开始搜索...')}
                        enterButton={
                            <>
                                <SearchOutlined />
                                {t('搜索')}
                            </>
                        }
                        size="large"
                        onSearch={onSearch}
                    />
                </div>

                <div className="search-tips">
                    <h4>{t('搜索提示')}</h4>
                    <ul>
                        <li>{t('支持文件名搜索')}</li>
                        <li>{t('支持模糊查询')}</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default BasicSearch; 