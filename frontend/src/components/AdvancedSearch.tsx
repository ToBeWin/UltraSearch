import * as React from 'react';
import { Form, Input, Select, DatePicker, InputNumber, Button, Row, Col, Switch } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface AdvancedSearchProps {
    onSearch: (values: any) => void;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ onSearch }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();

    const handleSearch = (values: any) => {
        onSearch(values);
    };

    return (
        <div className="search-wrapper">
            <div className="space-y-6">
                <div className="advanced-search-card">
                    <Form
                        form={form}
                        onFinish={handleSearch}
                        layout="vertical"
                        className="advanced-search-form"
                        size="large"
                        initialValues={{
                            fileType: 'all',
                            useRegex: false,
                            caseSensitive: false
                        }}
                    >
                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item
                                    label={t('文件类型')}
                                    name="fileType"
                                >
                                    <Select>
                                        <Select.Option value="all">{t('所有类型')}</Select.Option>
                                        <Select.Option value="document">{t('文档文件')}</Select.Option>
                                        <Select.Option value="image">{t('图片文件')}</Select.Option>
                                        <Select.Option value="video">{t('视频文件')}</Select.Option>
                                        <Select.Option value="audio">{t('音频文件')}</Select.Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label={t('文件路径')}
                                    name="filePath"
                                >
                                    <Input placeholder={t('输入文件路径')} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item
                                    label={t('文件大小范围 (MB)')}
                                    name="sizeRange"
                                >
                                    <div className="file-size-range">
                                        <InputNumber min={0} placeholder={t('最小')} />
                                        <span>-</span>
                                        <InputNumber min={0} placeholder={t('最大')} />
                                    </div>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label={t('修改时间范围')}
                                    name="timeRange"
                                >
                                    <DatePicker.RangePicker 
                                        style={{ width: '100%' }}
                                        placeholder={[t('开始时间'), t('结束时间')]}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col span={24}>
                                <Form.Item
                                    label={t('搜索内容')}
                                    name="content"
                                >
                                    <Input.TextArea
                                        placeholder={t('输入要搜索的内容')}
                                        rows={4}
                                        className="advanced-search-textarea"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item
                                    label={t('使用正则表达式')}
                                    name="useRegex"
                                    valuePropName="checked"
                                >
                                    <Switch />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label={t('区分大小写')}
                                    name="caseSensitive"
                                    valuePropName="checked"
                                >
                                    <Switch />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item className="search-button-container">
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SearchOutlined />}
                                className="advanced-search-button"
                            >
                                {t('开始搜索')}
                            </Button>
                        </Form.Item>
                    </Form>
                </div>

                <div className="search-tips">
                    <h4>{t('高级搜索提示')}</h4>
                    <ul>
                        <li>{t('使用正则表达式进行精确匹配')}</li>
                        <li>{t('可以指定搜索特定类型的文件')}</li>
                        <li>{t('支持排除特定文件或目录')}</li>
                        <li>{t('区分大小写选项可提高搜索准确性')}</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdvancedSearch; 