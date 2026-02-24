import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import type { Tyrant, TyrantCategory, Vote } from './types/database'
import SubmissionForm from './components/SubmissionForm'

type Route = 'home' | 'submit' | 'admin'

const CATEGORY_LABELS: Record<TyrantCategory | 'all', string> = {
  all: 'All',
  federal: 'Federal',
  state: 'State',
  local: 'Local',
  law_enforcement: 'Law Enforcement'
}

async function getIpHash(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    const ip = data.ip
    
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(ip + '-tyrantcam-vote')
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return 'anonymous-' + Date.now()
  }
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (signInError) throw signInError
      onLogin()
    } catch {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-tyrant-gray border-2 border-tyrant-red p-8">
        <h2 className="text-2xl font-bold text-white uppercase tracking-wide mb-6 text-center">
          Admin Login
        </h2>
        
        {error && (
          <div className="bg-red-900/30 border border-red-600 p-3 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold uppercase tracking-wide text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-tyrant-black border-2 border-gray-700 focus:border-tyrant-red text-white px-4 py-3 outline-none transition-colors"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold uppercase tracking-wide text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-tyrant-black border-2 border-gray-700 focus:border-tyrant-red text-white px-4 py-3 outline-none transition-colors"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-tyrant-red hover:bg-red-700 text-white font-bold py-3 px-6 uppercase tracking-widest text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-tyrant-gray border-2 border-tyrant-red p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wide">
            Admin Panel
          </h2>
          <button
            onClick={onLogout}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 text-sm uppercase tracking-wide transition-colors"
          >
            Logout
          </button>
        </div>
        
        <div className="text-gray-400 text-center py-12">
          <p>Admin functionality coming soon...</p>
          <p className="text-sm mt-2">Manage submissions and published tyrants here.</p>
        </div>
      </div>
    </div>
  )
}

function TyrantCard({ 
  tyrant, 
  hasVoted, 
  onVote 
}: { 
  tyrant: Tyrant
  hasVoted: boolean
  onVote: (tyrantId: string) => void
}) {
  const [isVoting, setIsVoting] = useState(false)
  const [localCount, setLocalCount] = useState(tyrant.shame_count)

  const handleVote = async () => {
    if (hasVoted || isVoting) return
    
    setIsVoting(true)
    try {
      await onVote(tyrant.id)
      setLocalCount(prev => prev + 1)
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="bg-tyrant-gray border-2 border-tyrant-red rounded-sm p-4 hover:shadow-[0_0_20px_rgba(138,0,0,0.5)] transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center">
      <div className="relative w-full aspect-square mb-4 overflow-hidden border border-tyrant-red group">
        {tyrant.image_url ? (
          <img 
            src={tyrant.image_url} 
            alt={tyrant.name} 
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
          />
        ) : (
          <div className="w-full h-full bg-tyrant-black flex items-center justify-center">
            <span className="text-4xl font-bold text-tyrant-red uppercase">
              {tyrant.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-2">
          <h3 className="text-2xl font-bold text-white uppercase tracking-widest drop-shadow-sm">
            {tyrant.name}
          </h3>
        </div>
        <div className="absolute top-2 right-2 bg-tyrant-red px-2 py-1 text-xs uppercase tracking-wide">
          {CATEGORY_LABELS[tyrant.category]}
        </div>
      </div>
      
      <div className="text-center w-full">
        <p className="text-tyrant-red font-mono text-sm mb-2 uppercase tracking-wide border-b border-tyrant-red pb-1 inline-block">
          {tyrant.title}
        </p>
        <p className="text-gray-400 text-xs mb-2">{tyrant.position}</p>
        <p className="text-gray-300 italic text-sm mt-2 line-clamp-3">"{tyrant.description}"</p>
      </div>
      
      <div className="mt-4 w-full flex items-center gap-2">
        <button 
          onClick={handleVote}
          disabled={hasVoted || isVoting}
          className={`flex-1 font-bold py-2 px-4 rounded-none uppercase tracking-widest text-xs transition-colors ${
            hasVoted 
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
              : 'bg-tyrant-red hover:bg-red-700 text-white'
          }`}
        >
          {hasVoted ? 'SHAMED!' : isVoting ? 'SHAMING...' : 'SHAME!'}
        </button>
        <div className="bg-tyrant-black px-3 py-2 border border-gray-700 min-w-[60px] text-center">
          <span className="text-white font-bold">{localCount}</span>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [route, setRoute] = useState<Route>('home')
  const [tyrants, setTyrants] = useState<Tyrant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<TyrantCategory | 'all'>('all')
  const [votedTyrants, setVotedTyrants] = useState<Set<string>>(new Set())
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const fetchTyrants = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await supabase
        .from('tyrants')
        .select('*')
        .eq('is_published', true)
        .order('shame_count', { ascending: false })
      
      if (fetchError) throw fetchError
      setTyrants(data as Tyrant[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tyrants')
    } finally {
      setLoading(false)
    }
  }, [])

  const checkVotedTyrants = useCallback(async () => {
    try {
      const ipHash = await getIpHash()
      
      const { data: votes } = await supabase
        .from('votes')
        .select('tyrant_id')
        .eq('ip_hash', ipHash)
      
      if (votes) {
        const votedIds = new Set(votes.map((v: Vote) => v.tyrant_id))
        setVotedTyrants(votedIds)
      }
    } catch {
      // Silently fail - votes will still work, just won't show "already voted" state
    }
  }, [])

  const checkAuth = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAdmin(!!session)
    } finally {
      setIsCheckingAuth(false)
    }
  }, [])

  useEffect(() => {
    fetchTyrants()
    checkVotedTyrants()
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session)
    })

    return () => subscription.unsubscribe()
  }, [fetchTyrants, checkVotedTyrants, checkAuth])

  const handleVote = useCallback(async (tyrantId: string) => {
    const ipHash = await getIpHash()
    
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        tyrant_id: tyrantId,
        ip_hash: ipHash
      } as never)
    
    if (voteError) {
      if (voteError.code === '23505') {
        setVotedTyrants(prev => new Set([...prev, tyrantId]))
      }
      throw voteError
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any).rpc('increment_shame_count', {
      tyrant_id: tyrantId
    })
    
    if (updateError) {
      setTyrants(prev => prev.map(t => 
        t.id === tyrantId ? { ...t, shame_count: t.shame_count + 1 } : t
      ))
    }
    
    setVotedTyrants(prev => new Set([...prev, tyrantId]))
  }, [])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    setIsAdmin(false)
  }, [])

  const filteredTyrants = categoryFilter === 'all' 
    ? tyrants 
    : tyrants.filter(t => t.category === categoryFilter)

  const categories: (TyrantCategory | 'all')[] = ['all', 'federal', 'state', 'local', 'law_enforcement']

  return (
    <div className="min-h-screen bg-tyrant-black text-white">
      <header className="sticky top-0 z-50 bg-tyrant-black/95 backdrop-blur border-b-2 border-tyrant-red">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <button 
              onClick={() => setRoute('home')}
              className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-600 to-tyrant-red uppercase tracking-tighter cursor-pointer hover:opacity-80 transition-opacity"
            >
              TYRANTCAM
            </button>
            
            <nav className="flex items-center gap-1 md:gap-4">
              <button
                onClick={() => setRoute('home')}
                className={`px-3 py-2 text-sm uppercase tracking-wide transition-colors ${
                  route === 'home' 
                    ? 'text-tyrant-red border-b-2 border-tyrant-red' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Wall of Shame
              </button>
              <button
                onClick={() => setRoute('submit')}
                className={`px-3 py-2 text-sm uppercase tracking-wide transition-colors ${
                  route === 'submit' 
                    ? 'text-tyrant-red border-b-2 border-tyrant-red' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Submit a Tyrant
              </button>
              {!isCheckingAuth && (
                <button
                  onClick={() => setRoute('admin')}
                  className={`px-3 py-2 text-sm uppercase tracking-wide transition-colors ${
                    route === 'admin' 
                      ? 'text-tyrant-red border-b-2 border-tyrant-red' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Admin
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {route === 'home' && (
        <>
          <div className="text-center py-8 border-b border-gray-800">
            <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-2">
              WALL OF SHAME
            </h1>
            <p className="text-lg md:text-xl font-mono text-gray-400 uppercase tracking-[0.3em]">
              Know Your Tyrants
            </p>
          </div>

          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-2 text-sm uppercase tracking-wide transition-all ${
                    categoryFilter === cat
                      ? 'bg-tyrant-red text-white'
                      : 'bg-tyrant-gray text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin w-12 h-12 border-4 border-tyrant-red border-t-transparent rounded-full mb-4" />
                <p className="text-gray-400 uppercase tracking-wide">Loading tyrants...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-20">
                <div className="bg-red-900/20 border border-red-600 p-6 max-w-md mx-auto">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button
                    onClick={() => fetchTyrants()}
                    className="bg-tyrant-red hover:bg-red-700 text-white px-6 py-2 uppercase tracking-wide text-sm transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && filteredTyrants.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-400 uppercase tracking-wide mb-2">No tyrants found</p>
                <p className="text-gray-600 text-sm">
                  {categoryFilter !== 'all' 
                    ? `No tyrants in the "${CATEGORY_LABELS[categoryFilter]}" category`
                    : 'Be the first to submit a tyrant!'}
                </p>
                <button
                  onClick={() => setRoute('submit')}
                  className="mt-4 bg-tyrant-red hover:bg-red-700 text-white px-6 py-2 uppercase tracking-wide text-sm transition-colors"
                >
                  Submit a Tyrant
                </button>
              </div>
            )}

            {!loading && !error && filteredTyrants.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredTyrants.map((tyrant) => (
                  <TyrantCard 
                    key={tyrant.id} 
                    tyrant={tyrant} 
                    hasVoted={votedTyrants.has(tyrant.id)}
                    onVote={handleVote}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {route === 'submit' && (
        <main className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-2">
              SUBMIT A TYRANT
            </h1>
            <p className="text-gray-400 font-mono text-sm uppercase tracking-wide">
              Expose Abuse of Power
            </p>
          </div>
          <SubmissionForm />
        </main>
      )}

      {route === 'admin' && (
        <main className="container mx-auto px-4 py-8">
          {isAdmin ? (
            <AdminPanel onLogout={handleLogout} />
          ) : (
            <AdminLogin onLogin={() => setIsAdmin(true)} />
          )}
        </main>
      )}

      <footer className="mt-20 text-center text-gray-600 text-sm font-mono py-8 border-t border-gray-800">
        <p>&copy; {new Date().getFullYear()} TYRANTCAM - EXPOSING THE TRUTH</p>
        <p className="mt-2 text-xs text-gray-700">
          All submissions are reviewed before publication. Vote once per 24 hours.
        </p>
      </footer>
    </div>
  )
}

export default App
