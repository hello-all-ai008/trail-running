import { useState } from 'react'
import Button from '../components/ui/Button'
import { signIn } from '../lib/api'

/**
 * Staff sign-in gate for the real-backend path. Admin-provisioned accounts
 * only — no self-signup (division-backend/CLAUDE.md).
 * @param {{ onSignedIn: () => void }} props
 */
function LoginPage({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(email, password)
      onSignedIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="glass-panel login-card" onSubmit={submit}>
        <span className="eyebrow">TrailTime · Staff</span>
        <h1>เข้าสู่ระบบเจ้าหน้าที่</h1>
        <p>บัญชีเจ้าหน้าที่สร้างโดยผู้ดูแลระบบเท่านั้น</p>

        <label className="field">
          <span>อีเมล</span>
          <input
            className="search"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>รหัสผ่าน</span>
          <input
            className="search"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="login-error">{error}</p>}

        <Button type="submit" className="login-submit">
          {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </Button>
      </form>
    </div>
  )
}

export default LoginPage
