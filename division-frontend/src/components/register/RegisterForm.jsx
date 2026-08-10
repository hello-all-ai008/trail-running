import { useState } from 'react'
import Button from '../ui/Button'
import { REGISTRATION_CATEGORIES, GENDERS, genderLabel } from '../../lib/raceData'
import { buildRegistration, saveRegistration, toRegistrationRow } from '../../lib/registration'
import { insertRegistration } from '../../lib/api'

const SHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL']

const INITIAL = {
  fullName: '',
  nameOnBib: '',
  gender: '',
  dob: '',
  nationality: 'Thai',
  category: '',
  phone: '',
  email: '',
  emergencyName: '',
  emergencyPhone: '',
  shirtSize: '',
  acceptWaiver: false,
}

/**
 * Public registration form. On valid submit it persists a pending record and
 * hands the record to onSuccess — the parent owns the confirmation UI.
 * @param {{ onSuccess: (record: Record<string, unknown>) => void }} props
 */
function RegisterForm({ onSuccess }) {
  const [values, setValues] = useState(INITIAL)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!values.acceptWaiver) {
      setError('กรุณายอมรับเงื่อนไขและสละสิทธิ์เรียกร้องก่อนส่งใบสมัคร')
      return
    }

    const record = buildRegistration({
      ...values,
      nameOnBib: values.nameOnBib.trim() || values.fullName.trim(),
    })
    saveRegistration(record)

    setBusy(true)
    try {
      await insertRegistration(toRegistrationRow(record))
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      setError(`บันทึกลง Supabase ไม่สำเร็จ (${detail}) — ข้อมูลถูกเก็บไว้ในเครื่องแล้ว ลองส่งใหม่อีกครั้ง`)
      setBusy(false)
      return
    }
    setBusy(false)
    onSuccess(record)
  }

  return (
    <form className="glass-panel reg-form" onSubmit={submit}>
      <div className="reg-form__grid">
        <label className="field reg-form__span">
          <span>ชื่อ-นามสกุล</span>
          <input className="search" type="text" value={values.fullName} onChange={update('fullName')} required />
        </label>

        <label className="field reg-form__span">
          <span>ชื่อบนเสื้อ (ถ้าเว้นว่างจะใช้ชื่อ-นามสกุล)</span>
          <input className="search" type="text" value={values.nameOnBib} onChange={update('nameOnBib')} />
        </label>

        <label className="field">
          <span>เพศ</span>
          <select className="search" value={values.gender} onChange={update('gender')} required>
            <option value="" disabled>เลือกเพศ</option>
            {GENDERS.map((g) => <option key={g} value={g}>{genderLabel(g)}</option>)}
          </select>
        </label>

        <label className="field">
          <span>วันเกิด</span>
          {/* max stops a mistyped future year at the browser before it reaches
              computeAgeGroup, which cannot derive a bracket from a negative age. */}
          <input
            className="search"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={values.dob}
            onChange={update('dob')}
            required
          />
        </label>

        <label className="field">
          <span>สัญชาติ</span>
          <input className="search" type="text" value={values.nationality} onChange={update('nationality')} required />
        </label>

        <label className="field">
          <span>ประเภทการแข่งขัน</span>
          <select className="search" value={values.category} onChange={update('category')} required>
            <option value="" disabled>เลือกระยะ</option>
            {REGISTRATION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label className="field">
          <span>เบอร์โทร</span>
          <input className="search" type="tel" value={values.phone} onChange={update('phone')} required />
        </label>

        <label className="field">
          <span>อีเมล</span>
          <input className="search" type="email" value={values.email} onChange={update('email')} required />
        </label>

        <label className="field">
          <span>ผู้ติดต่อฉุกเฉิน — ชื่อ</span>
          <input className="search" type="text" value={values.emergencyName} onChange={update('emergencyName')} required />
        </label>

        <label className="field">
          <span>ผู้ติดต่อฉุกเฉิน — เบอร์โทร</span>
          <input className="search" type="tel" value={values.emergencyPhone} onChange={update('emergencyPhone')} required />
        </label>

        <label className="field">
          <span>ไซส์เสื้อ</span>
          <select className="search" value={values.shirtSize} onChange={update('shirtSize')} required>
            <option value="" disabled>เลือกไซส์</option>
            {SHIRT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <label className="reg-form__waiver">
        <input type="checkbox" checked={values.acceptWaiver} onChange={update('acceptWaiver')} />
        <span>ยอมรับเงื่อนไขและสละสิทธิ์เรียกร้อง — ข้าพเจ้าเข้าร่วมด้วยความสมัครใจและรับความเสี่ยงเอง</span>
      </label>

      {error && <p className="login-error">{error}</p>}

      <Button type="submit" variant="accent" className="reg-form__submit">
        {busy ? 'กำลังส่งใบสมัคร…' : 'ส่งใบสมัคร'}
      </Button>
    </form>
  )
}

export default RegisterForm
