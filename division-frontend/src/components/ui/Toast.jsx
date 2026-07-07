import { useEffect, useState } from 'react'

const TOAST_DURATION_MS = 2600

/**
 * Transient toast. Re-shows whenever `notice` changes identity.
 * @param {{ notice: { text: string, error?: boolean, id: number } | null }} props
 */
function Toast({ notice }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!notice) return undefined
    setVisible(true)
    const id = setTimeout(() => setVisible(false), TOAST_DURATION_MS)
    return () => clearTimeout(id)
  }, [notice])

  if (!notice) return null
  return (
    <div className={`toast ${visible ? 'is-show' : ''} ${notice.error ? 'is-error' : ''}`} role="status">
      {notice.text}
    </div>
  )
}

export default Toast
