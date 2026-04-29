import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import EventPage from './pages/EventPage'
import CartPage from './pages/CartPage'
import SuccessPage from './pages/SuccessPage'
import CancelPage from './pages/CancelPage'
import OrderPage from './pages/OrderPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/evento/:slug" element={<EventPage />} />
      <Route path="/carrito" element={<CartPage />} />
      <Route path="/pago/exito" element={<SuccessPage />} />
      <Route path="/pago/cancelado" element={<CancelPage />} />
      <Route path="/mi-orden/:token" element={<OrderPage />} />
    </Routes>
  )
}
