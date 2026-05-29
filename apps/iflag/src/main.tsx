import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/iflag.css'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App, ConfigProvider } from 'antd'
import esES from 'antd/locale/es_ES'
import AppRouter from './router'
import { useThemeStore } from './stores/themeStore'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
})

const DARK_THEME = {
  token: {
    colorPrimary: '#00e676',
    colorBgContainer: '#161b22',
    colorBgElevated: '#161b22',
    colorBorder: '#30363d',
    colorText: '#e6edf3',
    colorTextSecondary: '#7d8590',
    borderRadius: 10,
    fontFamily: "'Inter', sans-serif",
  },
  components: {
    Modal: {
      contentBg: '#161b22',
      headerBg: '#161b22',
      titleColor: '#e6edf3',
    },
    Drawer: {
      colorBgElevated: '#161b22',
    },
    Select: {
      colorBgContainer: '#21262d',
      colorBgElevated: '#161b22',
      colorBorder: '#30363d',
      colorText: '#e6edf3',
    },
  },
}

const LIGHT_THEME = {
  token: {
    colorPrimary: '#1a7f37',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBorder: '#d0d7de',
    colorText: '#0d1117',
    colorTextSecondary: '#57606a',
    borderRadius: 10,
    fontFamily: "'Inter', sans-serif",
  },
  components: {
    Modal: {
      contentBg: '#ffffff',
      headerBg: '#f6f8fa',
      titleColor: '#0d1117',
    },
    Drawer: {
      colorBgElevated: '#ffffff',
    },
    Select: {
      colorBgContainer: '#f6f8fa',
      colorBgElevated: '#ffffff',
      colorBorder: '#d0d7de',
      colorText: '#0d1117',
    },
  },
}

function ThemedApp() {
  const isDark = useThemeStore(s => s.isDark)
  return (
    <ConfigProvider locale={esES} theme={isDark ? DARK_THEME : LIGHT_THEME}>
      <App>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </QueryClientProvider>
      </App>
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemedApp />
  </React.StrictMode>
)
