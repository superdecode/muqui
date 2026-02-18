import { useAuthStore } from '../stores/authStore'
import authService from '../services/authService'

export const useAuth = () => {
  const { user, isAuthenticated, login, logout } = useAuthStore()

  const handleLogin = async (email, password) => {
    const result = await authService.login(email, password)
    if (result.success) {
      login(result.user, result.token, result.role)
    }
    return result
  }

  const handleLogout = () => {
    authService.logout()
    logout()
  }

  return {
    user,
    isAuthenticated,
    login: handleLogin,
    logout: handleLogout
  }
}

export default useAuth
