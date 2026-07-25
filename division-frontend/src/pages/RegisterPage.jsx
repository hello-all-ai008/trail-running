import { useState } from 'react'
import RegisterHero from '../components/register/RegisterHero'
import RegisterForm from '../components/register/RegisterForm'

/**
 * Public standalone registration page (no auth gate, no admin shell).
 * Composes the hero + form and swaps the form for a confirmation panel on
 * successful submit. A BIB is assigned later by staff — this only records
 * a pending sign-up.
 */
function RegisterPage() {
  const [record, setRecord] = useState(null)
  const reference = record ? `REG-${String(record.id).slice(0, 8).toUpperCase()}` : ''

  return (
    <div className="reg-screen">
      <div className="reg-screen__inner">
        <RegisterHero />

        {record ? (
          <section className="glass-panel reg-success">
            <span className="eyebrow">ลงทะเบียนสำเร็จ</span>
            <h2 className="reg-success__title">ขอบคุณที่สมัคร {String(record.fullName)}</h2>
            <p className="reg-success__msg">
              ลงทะเบียนสำเร็จ เจ้าหน้าที่จะติดต่อยืนยันและมอบหมายหมายเลข BIB ภายหลัง
            </p>
            <div className="reg-success__ref">
              <span className="reg-success__ref-label">หมายเลขอ้างอิง</span>
              <span className="reg-success__ref-code">{reference}</span>
            </div>
          </section>
        ) : (
          <RegisterForm onSuccess={setRecord} />
        )}
      </div>
    </div>
  )
}

export default RegisterPage
