import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp } from 'antd'
import esES from 'antd/locale/es_ES'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import './styles/design-tokens.css'
import AppRouter from './router'

dayjs.locale('es')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={esES}
        theme={{
          token: {
            colorPrimary: '#7C3AED',
            colorLink: '#7C3AED',
            borderRadius: 10,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            colorBgContainer: '#FFFFFF',
            colorBorder: '#EDE9FE',
          },
          components: {
            Button: { borderRadius: 10, fontWeight: 500 },
            Card: { borderRadius: 12 },
            Input: { borderRadius: 10 },
            Select: { borderRadius: 10 },
          },
        }}
      >
        <AntApp>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
