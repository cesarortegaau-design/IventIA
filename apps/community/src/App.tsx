import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import esES from 'antd/locale/es_ES'
import HomePage from './pages/HomePage'
import './App.css'

function App() {
  return (
    <ConfigProvider locale={esES}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </Router>
    </ConfigProvider>
  )
}

export default App
