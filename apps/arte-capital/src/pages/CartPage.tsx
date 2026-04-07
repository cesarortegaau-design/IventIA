import { Button, Empty, Table } from 'antd'
import { useNavigate } from 'react-router-dom'

export default function CartPage() {
  const navigate = useNavigate()

  return (
    <div>
      <h2>Carrito de Compras</h2>
      <Empty
        description="Tu carrito está vacío"
        style={{ marginTop: 48 }}
      />
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Button type="primary" onClick={() => navigate('/catalog')}>
          Continuar Comprando
        </Button>
      </div>
    </div>
  )
}
