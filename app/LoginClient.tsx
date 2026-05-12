'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginClient() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: '12px',
    border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
    color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      fontFamily: "'Nunito', system-ui, sans-serif", padding: '20px', position: 'relative', overflow: 'hidden', WebkitOverflowScrolling: 'touch'
    }}>
      {/* Decorative blobs */}
      <div style={{ position:'absolute', top:'-10%', left:'-5%', width:'500px', height:'500px', borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-10%', right:'-5%', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:'420px', position:'relative', animation:'fadeIn 0.5s ease' }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'36px' }}>
          <div style={{
            width:'72px', height:'72px', borderRadius:'20px', margin:'0 auto 20px',
            background:'linear-gradient(135deg, #6366f1, #ec4899)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px',
            boxShadow:'0 20px 40px rgba(99,102,241,0.4)'
          }}>📚</div>
          <h1 style={{ color:'#f1f5f9', fontSize:'32px', fontWeight:'800', margin:'0 0 6px', fontFamily:"'Sora', sans-serif", letterSpacing:'-0.5px' }}>Legacy Study Center</h1>
          <p style={{ color:'rgba(148,163,184,0.8)', fontSize:'14px' }}>Solapur's Premier Study Destination</p>
        </div>

        {/* Card */}
        <div style={{
          background:'rgba(255,255,255,0.04)', borderRadius:'24px', padding:'36px',
          border:'1.5px solid rgba(255,255,255,0.08)', backdropFilter:'blur(20px)',
          boxShadow:'0 25px 50px rgba(0,0,0,0.5)'
        }}>
          <p style={{ color:'#94a3b8', fontSize:'13px', marginBottom:'28px', textAlign:'center' }}>Sign in to your account</p>

          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div>
              <label style={{ display:'block', color:'#94a3b8', fontSize:'11px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'8px' }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" style={inp} />
            </div>

            <div>
              <label style={{ display:'block', color:'#94a3b8', fontSize:'11px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'8px' }}>Password</label>
              <div style={{ position:'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                  style={{ ...inp, paddingRight:'44px' }} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:'16px', lineHeight:1 }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'10px', padding:'12px 14px', color:'#fca5a5', fontSize:'13px' }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              padding:'14px', borderRadius:'12px', border:'none', cursor: loading ? 'not-allowed' : 'pointer',
              background:'linear-gradient(135deg, #6366f1, #ec4899)', color:'white', fontSize:'15px', fontWeight:'700',
              opacity: loading ? 0.7 : 1, transition:'all 0.2s', marginTop:'4px', fontFamily:'inherit',
              boxShadow:'0 8px 20px rgba(99,102,241,0.4)'
            }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', color:'rgba(100,116,139,0.7)', fontSize:'12px', marginTop:'24px' }}>
          Contact your admin for account access
        </p>
      </div>
    </div>
  )
}
