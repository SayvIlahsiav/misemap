import { useState } from 'react'
import { ChefHat, Mail, Lock, Plus, Users, ArrowRight, AlertCircle, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { Btn, Inp, InfoBox } from './UIPrimitives.jsx'

export default function AuthPortal() {
  const { user, profile, signIn, signUp, createCafe, joinCafe } = useAuth()
  
  // Auth state
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // Onboarding state
  const [onboardingMode, setOnboardingMode] = useState('choose') // 'choose' | 'create' | 'join'
  const [cafeName, setCafeName] = useState('')
  const [cafeId, setCafeId] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    
    if (!email.trim() || !password) {
      setError('Please fill in all fields.')
      return
    }

    if (isSignUp) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    setLoading(true)
    try {
      if (isSignUp) {
        const res = await signUp(email, password)
        if (res && !res.session) {
          setSuccessMsg('Account created! Please check your email inbox to verify your account.')
        }
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCafe = async (e) => {
    e.preventDefault()
    setError('')
    if (!cafeName.trim()) {
      setError('Please enter a cafe name.')
      return
    }
    setLoading(true)
    try {
      await createCafe(cafeName)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to create cafe.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinCafe = async (e) => {
    e.preventDefault()
    setError('')
    const trimmedId = cafeId.trim()
    if (!trimmedId) {
      setError('Please enter a Cafe ID.')
      return
    }
    
    // Simple UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(trimmedId)) {
      setError('Please enter a valid Cafe ID (UUID format).')
      return
    }

    setLoading(true)
    try {
      await joinCafe(trimmedId)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to join cafe. Please verify the Cafe ID is correct.')
    } finally {
      setLoading(false)
    }
  }

  const renderAuthForm = () => (
    <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
        <div style={{ position: 'relative' }}>
          <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="chef@misemap.com"
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: '10px 12px 10px 38px',
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.2s',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
        <div style={{ position: 'relative' }}>
          <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: '10px 12px 10px 38px',
              fontSize: 13,
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      {isSignUp && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '10px 12px 10px 38px',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 12, lineHeight: 1.4 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '10px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, color: '#065f46', fontSize: 12, lineHeight: 1.4 }}>
          {successMsg}
        </div>
      )}

      <Btn
        ch={loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
        v="primary"
        disabled={loading}
        style={{ justifyContent: 'center', padding: '11px', borderRadius: 10, marginTop: 4, width: '100%' }}
      />

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp)
            setError('')
            setSuccessMsg('')
          }}
          style={{ background: 'none', border: 'none', color: '#0d9488', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </form>
  )

  const renderOnboarding = () => (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111', margin: 0 }}>Welcome to MiseMap</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Let's connect you with a kitchen workspace</p>
      </div>

      {onboardingMode === 'choose' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button
            onClick={() => setOnboardingMode('create')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '20px',
              borderRadius: 14,
              border: '2px solid #e0f2fe',
              background: 'linear-gradient(135deg, #fff 0%, #f0f9ff 100%)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0d9488'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e0f2fe'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ background: '#e0f2fe', padding: 12, borderRadius: 12, display: 'flex', color: '#0284c7' }}>
              <Plus size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0369a1' }}>Create a New Cafe</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Spawn a fresh tenant workspace to manage your recipes, ingredients and margins.</div>
            </div>
            <ArrowRight size={18} style={{ color: '#0284c7' }} />
          </button>

          <button
            onClick={() => setOnboardingMode('join')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '20px',
              borderRadius: 14,
              border: '2px solid #f0fdfa',
              background: 'linear-gradient(135deg, #fff 0%, #f0fdfa 100%)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0d9488'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#f0fdfa'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ background: '#ccfbf1', padding: 12, borderRadius: 12, display: 'flex', color: '#0d9488' }}>
              <Users size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f766e' }}>Join an Existing Cafe</div>
              <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>Enter a Cafe ID shared by your owner to collaborate on the same menu.</div>
            </div>
            <ArrowRight size={18} style={{ color: '#0d9488' }} />
          </button>
        </div>
      )}

      {onboardingMode === 'create' && (
        <form onSubmit={handleCreateCafe} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cafe / Restaurant Name</label>
            <input
              type="text"
              value={cafeName}
              onChange={(e) => setCafeName(e.target.value)}
              placeholder="e.g. Central Bakery"
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 12 }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Btn ch="Back" onClick={() => setOnboardingMode('choose')} v="secondary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }} />
            <Btn ch={loading ? 'Creating...' : 'Create Cafe'} v="primary" disabled={loading} style={{ flex: 2, justifyContent: 'center' }} />
          </div>
        </form>
      )}

      {onboardingMode === 'join' && (
        <form onSubmit={handleJoinCafe} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cafe ID (UUID format)</label>
            <input
              type="text"
              value={cafeId}
              onChange={(e) => setCafeId(e.target.value)}
              placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'monospace'
              }}
            />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 12 }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Btn ch="Back" onClick={() => setOnboardingMode('choose')} v="secondary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }} />
            <Btn ch={loading ? 'Joining...' : 'Join Cafe'} v="primary" disabled={loading} style={{ flex: 2, justifyContent: 'center' }} />
          </div>
        </form>
      )}
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #e0f2fe 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Visual background blobs for premium aesthetics */}
      <div style={{
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: 'rgba(45, 212, 191, 0.15)',
        filter: 'blur(60px)',
        top: '10%',
        left: '15%',
        zIndex: 1
      }} />
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'rgba(56, 189, 248, 0.15)',
        filter: 'blur(80px)',
        bottom: '10%',
        right: '15%',
        zIndex: 1
      }} />

      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        borderRadius: 24,
        boxShadow: '0 25px 50px -12px rgba(15, 118, 110, 0.08), 0 0 1px rgba(0, 0, 0, 0.05)',
        padding: '36px 32px',
        zIndex: 10,
        position: 'relative'
      }}>
        {/* Header Logo */}
        {!user && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{
              background: 'linear-gradient(135deg, #0d9488, #0f766e)',
              borderRadius: 16,
              padding: 12,
              display: 'flex',
              boxShadow: '0 10px 20px -5px rgba(13, 148, 136, 0.3)'
            }}>
              <ChefHat size={28} style={{ color: '#fff' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 24, color: '#111', letterSpacing: '-0.02em' }}>MiseMap</span>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Sparkles size={12} style={{ color: '#0d9488' }} /> Recipe Costing & Cafe Management
              </p>
            </div>
          </div>
        )}

        {user && !profile?.cafe_id ? renderOnboarding() : renderAuthForm()}
      </div>
    </div>
  )
}
