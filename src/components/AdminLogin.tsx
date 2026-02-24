import { useState, createContext, useContext, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, Lock, Mail, AlertTriangle, ShieldAlert } from 'lucide-react'

interface AdminUser {
  id: string
  email: string
  created_at: string
}

interface AuthContextType {
  isAdmin: boolean
  isLoading: boolean
  adminUser: AdminUser | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | null>(null)

const AUTH_STORAGE_KEY = 'tyrantcam_admin_session'
const RATE_LIMIT_KEY = 'tyrantcam_login_attempts'
const MAX_LOGIN_ATTEMPTS = 5
const RATE_LIMIT_WINDOW = 15 * 60 * 1000

interface LoginAttempt {
  count: number
  firstAttempt: number
}

function getLoginAttempts(): LoginAttempt {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY)
    if (!stored) return { count: 0, firstAttempt: Date.now() }
    
    const attempts = JSON.parse(stored) as LoginAttempt
    if (Date.now() - attempts.firstAttempt > RATE_LIMIT_WINDOW) {
      return { count: 0, firstAttempt: Date.now() }
    }
    return attempts
  } catch {
    return { count: 0, firstAttempt: Date.now() }
  }
}

function recordLoginAttempt(): void {
  const attempts = getLoginAttempts()
  const newAttempts: LoginAttempt = {
    count: attempts.count + 1,
    firstAttempt: attempts.firstAttempt || Date.now()
  }
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(newAttempts))
}

function clearLoginAttempts(): void {
  localStorage.removeItem(RATE_LIMIT_KEY)
}

function isRateLimited(): boolean {
  const attempts = getLoginAttempts()
  return attempts.count >= MAX_LOGIN_ATTEMPTS
}

function getRemainingLockoutTime(): number {
  const attempts = getLoginAttempts()
  if (attempts.count < MAX_LOGIN_ATTEMPTS) return 0
  const elapsed = Date.now() - attempts.firstAttempt
  return Math.max(0, Math.ceil((RATE_LIMIT_WINDOW - elapsed) / 1000 / 60))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const { data: adminData, error } = await supabase
          .from('admin_users')
          .select('id, email, created_at')
          .eq('id', session.user.id)
          .single()
        
        if (!error && adminData) {
          setAdminUser(adminData as AdminUser)
          setIsAdmin(true)
          return true
        }
      }
      
      setAdminUser(null)
      setIsAdmin(false)
      return false
    } catch {
      setAdminUser(null)
      setIsAdmin(false)
      return false
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (isRateLimited()) {
      const remaining = getRemainingLockoutTime()
      return { 
        success: false, 
        error: `Too many login attempts. Please try again in ${remaining} minute${remaining !== 1 ? 's' : ''}.` 
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        recordLoginAttempt()
        return { success: false, error: 'Invalid email or password' }
      }

      if (data.user) {
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('id, email, created_at')
          .eq('id', data.user.id)
          .single()

        if (adminError || !adminData) {
          await supabase.auth.signOut()
          recordLoginAttempt()
          return { success: false, error: 'Access denied. Admin privileges required.' }
        }

        clearLoginAttempts()
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
          userId: data.user.id,
          timestamp: Date.now()
        }))
        
        setAdminUser(adminData as AdminUser)
        setIsAdmin(true)
        return { success: true }
      }

      recordLoginAttempt()
      return { success: false, error: 'Login failed. Please try again.' }
    } catch {
      recordLoginAttempt()
      return { success: false, error: 'An unexpected error occurred. Please try again.' }
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem(AUTH_STORAGE_KEY)
      setAdminUser(null)
      setIsAdmin(false)
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      setAdminUser(null)
      setIsAdmin(false)
    }
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      await checkAuth()
      setIsLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setAdminUser(null)
        setIsAdmin(false)
        localStorage.removeItem(AUTH_STORAGE_KEY)
      } else if (event === 'SIGNED_IN') {
        await checkAuth()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [checkAuth])

  return (
    <AuthContext.Provider value={{ isAdmin, isLoading, adminUser, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AdminLoginProps {
  onSuccess?: () => void
  redirectUrl?: string
}

interface FormErrors {
  email?: string
  password?: string
}

export default function AdminLogin({ onSuccess, redirectUrl = '/admin' }: AdminLoginProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address'
    return undefined
  }

  const validatePassword = (value: string): string | undefined => {
    if (!value) return 'Password is required'
    if (value.length < 6) return 'Password must be at least 6 characters'
    return undefined
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      email: validateEmail(email),
      password: validatePassword(password)
    }
    setErrors(newErrors)
    return !newErrors.email && !newErrors.password
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: validateEmail(e.target.value) }))
    }
    if (error) setError('')
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: validatePassword(e.target.value) }))
    }
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    setError('')

    const result = await login(email.trim(), password)

    if (result.success) {
      if (onSuccess) {
        onSuccess()
      } else if (redirectUrl) {
        window.location.href = redirectUrl
      }
    } else {
      setError(result.error || 'Login failed')
    }

    setIsLoading(false)
  }

  const remainingLockout = getRemainingLockoutTime()
  const isLocked = isRateLimited()

  return (
    <div className="min-h-screen bg-tyrant-black flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-tyrant-red/20 border-2 border-tyrant-red mb-4">
            <ShieldAlert className="w-8 h-8 text-tyrant-red" />
          </div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wide">Admin Access</h1>
          <p className="text-gray-500 text-sm mt-2">Secure login for moderation panel</p>
        </div>

        <div className="bg-tyrant-gray border-2 border-gray-800 p-6">
          {isLocked && (
            <div className="bg-red-900/30 border border-red-600 p-4 flex items-center gap-3 mb-6">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-400 text-sm">
                Account temporarily locked. Try again in {remainingLockout} minute{remainingLockout !== 1 ? 's' : ''}.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && !isLocked && (
              <div className="bg-red-900/30 border border-red-600 p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold uppercase tracking-wide text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="admin@example.com"
                  disabled={isLoading || isLocked}
                  autoComplete="email"
                  className={`w-full bg-tyrant-black border-2 ${errors.email ? 'border-red-500' : 'border-gray-700 focus:border-tyrant-red'} text-white pl-12 pr-4 py-3 outline-none transition-colors placeholder-gray-600 disabled:opacity-50 disabled:cursor-not-allowed`}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold uppercase tracking-wide text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter your password"
                  disabled={isLoading || isLocked}
                  autoComplete="current-password"
                  className={`w-full bg-tyrant-black border-2 ${errors.password ? 'border-red-500' : 'border-gray-700 focus:border-tyrant-red'} text-white pl-12 pr-12 py-3 outline-none transition-colors placeholder-gray-600 disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || isLocked}
              className={`w-full py-4 px-6 font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 ${
                !isLoading && !isLocked
                  ? 'bg-tyrant-red hover:bg-red-700 text-white'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-xs">
            Authorized personnel only. All access attempts are logged.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-600">
          <ShieldAlert className="w-4 h-4" />
          <span>Protected by rate limiting</span>
        </div>
      </div>
    </div>
  )
}

export type { AdminLoginProps, AdminUser, AuthContextType }
