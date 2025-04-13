import * as React from 'react';
import { useState } from 'react';
import { Layout, ConfigProvider, theme, Space, Select, Button, Tooltip } from 'antd';
import { TranslationOutlined, GithubOutlined, BulbOutlined, BulbFilled } from '@ant-design/icons';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import i18n from '../../i18n';
import { useTranslation } from 'react-i18next';

const { Header, Content, Footer } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [locale, setLocale] = useState(zhCN);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { t } = useTranslation();

  const handleLocaleChange = (value: string) => {
    setLocale(value === 'en' ? enUS : zhCN);
    i18n.changeLanguage(value);
  };

  const handleThemeChange = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <ConfigProvider
      locale={locale}
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 8,
          wireframe: false,
          colorBgContainer: isDarkMode ? '#111827' : '#ffffff',
          colorBgLayout: isDarkMode ? '#0f172a' : '#f8fafc',
          colorBgElevated: isDarkMode ? '#1f2937' : '#ffffff',
          colorText: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
          colorTextSecondary: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)',
        },
      }}
    >
      <Layout className={`app-container ${isDarkMode ? 'dark' : ''} min-h-screen bg-gray-50 dark:bg-dark-800`}>
        <Header className="flex items-center justify-between bg-white/80 dark:bg-dark-700/80 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-800 px-6">
          <div className="flex items-center">
            <img src="/logo.png" alt="UltraSearch" className="h-8 mr-4" />
            {/* <h1 className="text-xl font-bold m-0 text-gray-800 dark:text-white">
              UltraSearch
            </h1> */}
          </div>
          <Space size="middle">
            <Tooltip title={t('切换语言')}>
              <Select
                defaultValue="zh"
                onChange={handleLocaleChange}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'zh', label: '中文' },
                ]}
                className="w-24"
              />
            </Tooltip>
            <Tooltip title={t('切换主题')}>
              <Button
                type="text"
                icon={isDarkMode ? <BulbFilled /> : <BulbOutlined />}
                onClick={handleThemeChange}
                className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary"
              />
            </Tooltip>
            <Tooltip title={t('GitHub 仓库')}>
              <Button
                type="text"
                icon={<GithubOutlined />}
                href="https://github.com/ToBeWin/UltraSearch"
                target="_blank"
                className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary"
              />
            </Tooltip>
          </Space>
        </Header>
        <Content className="content-container bg-gray-50 dark:bg-dark-800">
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-white/80 dark:bg-dark-700/80 backdrop-blur-md p-8 rounded-xl shadow-lg min-h-[calc(100vh-200px)] transition-all duration-300 border border-gray-100 dark:border-gray-800">
              {children}
            </div>
          </div>
        </Content>
        <div className="copyright-footer">
          © {new Date().getFullYear()} UltraSearch. {t('Created with JingYe')}
        </div>
      </Layout>
    </ConfigProvider>
  );
};

export default AppLayout; 