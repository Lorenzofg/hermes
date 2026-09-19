import { ref } from 'vue'
import axios from 'axios'

interface AuthUser {
  id: number
  email: string
}

const TOKEN_KEY = 'hermes_token'
const USER_KEY = 'hermes_user'

const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
const user = ref<AuthUser | null>(JSON.parse(localStorage.getItem(USER_KEY) ?? 'null'))

// Applied once at module load (page refresh) and again after every login —
// axios's default instance is shared by every composable that does
// `import axios from 'axios'`, so this header reaches all of them.
if (token.value) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
}

function setSession(newToken: string, newUser: AuthUser) {
  token.value = newToken
  user.value = newUser
  localStorage.setItem(TOKEN_KEY, newToken)
  localStorage.setItem(USER_KEY, JSON.stringify(newUser))
  axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
}

export function useAuth() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function login(email: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const { data } = await axios.post<{ token: string; user: AuthUser }>('/api/auth/login', { email, password })
      setSession(data.token, data.user)
      return true
    } catch (e: unknown) {
      error.value = axios.isAxiosError(e) ? (e.response?.data?.error ?? 'Login failed.') : 'Unexpected error.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(email: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const { data } = await axios.post<{ token: string; user: AuthUser }>('/api/auth/register', { email, password })
      setSession(data.token, data.user)
      return true
    } catch (e: unknown) {
      error.value = axios.isAxiosError(e) ? (e.response?.data?.error ?? 'Registration failed.') : 'Unexpected error.'
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    delete axios.defaults.headers.common['Authorization']
  }

  function authHeader(): Record<string, string> {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {}
  }

  return { token, user, loading, error, login, register, logout, authHeader }
}
