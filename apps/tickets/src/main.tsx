import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App, ConfigProvider } from 'antd'
import esES from 'antd/locale/es_ES'
import AppRouter from './App'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={esES} theme={{ token: { colorPrimary: '#6B46C1' } }}>
      <App>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </QueryClientProvider>
      </App>
    </ConfigProvider>
  </React.StrictMode>,
)
