import { useState } from 'react'
import { ChefHat, Mail, Lock, Plus, Users, ArrowRight, AlertCircle, Sparkles, RefreshCw, LogOut, CheckSquare, Square } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { Btn } from './UIPrimitives.jsx'

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: 8, flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
)

export default function AuthPortal() {
  const { user, profile, pendingRequest, signIn, signUp, signInWithGoogle, signOut, createOrg, joinOrg, cancelJoinRequest, refreshProfile } = useAuth()
  
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
  const [orgName, setOrgName] = useState('')
  const [orgId, setOrgId] = useState('')
  const [shouldSeed, setShouldSeed] = useState(true) // Default to true since they liked the idea

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
      setError(err.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Google Sign-in failed. Please verify credentials in your Supabase console.')
      setLoading(false)
    }
  }

  const handleCreateOrg = async (e) => {
    e.preventDefault()
    setError('')
    if (!orgName.trim()) {
      setError('Please enter an organization name.')
      return
    }
    setLoading(true)
    try {
      await createOrg(orgName, shouldSeed)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to create organization.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinOrg = async (e) => {
    e.preventDefault()
    setError('')
    const trimmedId = orgId.trim()
    if (!trimmedId) {
      setError('Please enter an Organization ID.')
      return
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(trimmedId)) {
      setError('Please enter a valid Organization ID (UUID format).')
      return
    }

    setLoading(true)
    try {
      await joinOrg(trimmedId)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to request membership. Please check the Organization ID.')
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

      <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0' }}>
        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        <span style={{ padding: '0 8px', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>OR</span>
        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          color: '#374151',
          border: '1px solid #d1d5db',
          borderRadius: 10,
          padding: '10px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          width: '100%',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff' }}
      >
        <GoogleIcon /> Sign In with Google
      </button>

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
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0369a1' }}>Create an Organization</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Establish a new kitchen workspace to manage your ingredients, recipes, and costs.</div>
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
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f766e' }}>Join an Organization</div>
              <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>Request membership using a shared Organization ID from your administrator.</div>
            </div>
            <ArrowRight size={18} style={{ color: '#0d9488' }} />
          </button>

          <div style={{ borderTop: '1px solid #f1f1f1', paddingTop: 12, display: 'flex', justifyContent: 'center' }}>
            <button onClick={signOut} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <LogOut size={14} /> Sign Out of Account
            </button>
          </div>
        </div>
      )}

      {onboardingMode === 'create' && (
        <form onSubmit={handleCreateOrg} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Grand Pastry"
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

          <div
            onClick={() => setShouldSeed(!shouldSeed)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            {shouldSeed ? (
              <CheckSquare size={18} style={{ color: '#0d9488' }} />
            ) : (
              <Square size={18} style={{ color: '#9ca3af' }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Pre-populate with sample kitchen data</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>Loads standard ingredients, intermediates, and menu costing items.</div>
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 12 }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Btn ch="Back" onClick={() => setOnboardingMode('choose')} v="secondary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }} />
            <Btn ch={loading ? 'Creating...' : 'Create Org'} v="primary" disabled={loading} style={{ flex: 2, justifyContent: 'center' }} />
          </div>
        </form>
      )}

      {onboardingMode === 'join' && (
        <form onSubmit={handleJoinOrg} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Organization ID (UUID format)</label>
            <input
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
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
            <Btn ch={loading ? 'Requesting...' : 'Request to Join'} v="primary" disabled={loading} style={{ flex: 2, justifyContent: 'center' }} />
          </div>
        </form>
      )}
    </div>
  )

  const renderPendingRequest = () => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          borderRadius: 16,
          padding: 12,
          display: 'flex',
          boxShadow: '0 10px 20px -5px rgba(245, 158, 11, 0.3)',
          color: '#fff'
        }}>
          <RefreshCw size={28} className="animate-spin" style={{ animation: 'spin 3s linear infinite' }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111', margin: 0 }}>Membership Pending</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 1.4 }}>
          Your request to join <strong>{pendingRequest?.organizations?.name}</strong> is awaiting approval by the owner.
        </p>
      </div>

      <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 10, color: '#b45309', fontSize: 12, lineHeight: 1.4, marginBottom: 20 }}>
        Please ask the organization owner to approve your request in their <strong>Settings</strong> page.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Btn
          ch={<><RefreshCw size={14} /> Refresh Status</>}
          onClick={refreshProfile}
          v="primary"
          disabled={loading}
          style={{ justifyContent: 'center', width: '100%', padding: 10, borderRadius: 10 }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn
            ch="Withdraw Request"
            onClick={cancelJoinRequest}
            v="secondary"
            disabled={loading}
            style={{ flex: 1, justifyContent: 'center', padding: 8, borderRadius: 10, fontSize: 12 }}
          />
          <button
            onClick={signOut}
            style={{
              flex: 1, background: 'none', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12,
              fontWeight: 600, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
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
      {/* Background blobs */}
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
        {(!user || (!profile?.org_id && !pendingRequest)) && (
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
                <Sparkles size={12} style={{ color: '#0d9488' }} /> Recipe Costing & Org Management
              </p>
            </div>
          </div>
        )}

        {user ? (
          pendingRequest ? renderPendingRequest() : renderOnboarding()
        ) : (
          renderAuthForm()
        )}
      </div>
    </div>
  )
}
