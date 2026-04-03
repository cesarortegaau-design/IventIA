import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Form, Input, Button, Typography, App, Descriptions, Skeleton } from 'antd'
import { ordersApi } from '../../api/orders'
import { useAuthStore } from '../../stores/authStore'

const { Title } = Typography

export default function ProfilePage() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { user, setAuth, accessToken, refreshToken } = useAuthStore()
  const [form] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['portal-me'],
    queryFn: () => ordersApi.me(),
  })

  const me = data?.data?.data

  if (me && !form.isFieldsTouched()) {
    form.setFieldsValue({ firstName: me.firstName, lastName: me.lastName, phone: me.phone })
  }

  const mutation = useMutation({
    mutationFn: (values: any) => ordersApi.updateMe(values),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['portal-me'] })
      const updated = res.data.data
      setAuth({ id: updated.id, email: updated.email, firstName: updated.firstName, lastName: updated.lastName, phone: updated.phone }, accessToken!, refreshToken!)
      message.success('Datos actualizados')
    },
    onError: () => message.error('Error al actualizar'),
  })

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Mis Datos</Title>

      {isLoading ? <Skeleton active /> : (
        <>
          <Card title="Información personal" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical" onFinish={mutation.mutate}>
              <Form.Item name="firstName" label="Nombre" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="lastName" label="Apellido" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="phone" label="Teléfono">
                <Input />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                Guardar cambios
              </Button>
            </Form>
          </Card>

          {me?.client && (
            <Card title="Datos del expositor">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Razón social / Nombre">
                  {me.client.companyName || `${me.client.firstName} ${me.client.lastName}`}
                </Descriptions.Item>
                {me.client.rfc && <Descriptions.Item label="RFC">{me.client.rfc}</Descriptions.Item>}
                {me.client.taxRegime && <Descriptions.Item label="Régimen fiscal">{me.client.taxRegime}</Descriptions.Item>}
                {me.client.addressStreet && (
                  <Descriptions.Item label="Dirección">
                    {[me.client.addressStreet, me.client.addressCity, me.client.addressState, me.client.addressZip].filter(Boolean).join(', ')}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
