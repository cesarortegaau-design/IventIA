import axios from 'axios'

const publicClient = axios.create({ baseURL: '/api/v1' })

export const authApi = {
  login: (email: string, password: string) =>
    publicClient.post('/auth/login', { email, password }).then(r => r.data),
}
