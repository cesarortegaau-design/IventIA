import { useQuery } from '@tanstack/react-query'
import { Card, Form, Input, Button, Spin } from 'antd'
import { arteCapitalApi } from '../../api/arte-capital'
import { useState } from 'react'

export default function SettingsPage() {
  const [form] = Form.useForm()
  const { data, isLoading } = useQuery({
    queryKey: ['arte-capital-settings'],
    queryFn: () => arteCapitalApi.settings.get(),
  })

  const [saving, setSaving] = useState(false)

  const onFinish = async (values: any) => {
    setSaving(true)
    await arteCapitalApi.settings.update(values)
    setSaving(false)
  }

  return (
    <div>
      <h2>Configuración de Arte Capital</h2>
      <Card>
        <Spin spinning={isLoading}>
          <Form form={form} layout="vertical" onFinish={onFinish} initialValues={data}>
            <Form.Item label="Comisión Predeterminada (%)" name="defaultCommissionRate">
              <Input type="number" step="0.01" />
            </Form.Item>
            <Form.Item label="Impuesto (%)" name="taxRate">
              <Input type="number" step="0.01" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              Guardar
            </Button>
          </Form>
        </Spin>
      </Card>
    </div>
  )
}
