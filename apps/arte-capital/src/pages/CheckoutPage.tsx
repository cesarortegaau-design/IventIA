import { Card, Form, Button, Input, Select } from 'antd'

export default function CheckoutPage() {
  const [form] = Form.useForm()

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h2>Checkout</h2>

      <Card style={{ marginBottom: 24 }}>
        <h3>Resumen de Orden</h3>
        <div style={{ marginBottom: 8 }}>Subtotal: $0.00</div>
        <div style={{ marginBottom: 8 }}>Impuesto: $0.00</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Total: $0.00</div>
      </Card>

      <Card>
        <h3>Información de Pago</h3>
        <Form form={form} layout="vertical">
          <Form.Item label="Método de Pago" name="method">
            <Select options={[
              { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito' },
              { value: 'TRANSFER', label: 'Transferencia Bancaria' },
              { value: 'CASH', label: 'Efectivo' },
            ]} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" block size="large">
              Completar Compra
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
