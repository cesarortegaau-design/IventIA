import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

const publicClient = axios.create({ baseURL })

export const authApi = {
  login: (email: string, password: string) =>
    publicClient.post('/auth/login', { email, password }).then(r => r.data),
}
