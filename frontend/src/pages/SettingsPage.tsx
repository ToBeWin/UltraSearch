import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Typography, Space } from 'antd';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';

const { Title } = Typography;

const SettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSelectDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      
      if (selected) {
        form.setFieldValue('indexPath', selected);
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
    }
  };

  const handleSubmit = async (values: { indexPath: string }) => {
    setLoading(true);
    try {
      await invoke('build_index', { path: values.indexPath });
      message.success('索引构建成功');
    } catch (error) {
      console.error('Error building index:', error);
      message.error('索引构建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Title level={2}>设置</Title>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="索引路径"
            name="indexPath"
            rules={[{ required: true, message: '请选择索引路径' }]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input placeholder="选择要索引的目录" />
              <Button onClick={handleSelectDirectory}>浏览</Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              构建索引
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SettingsPage; 