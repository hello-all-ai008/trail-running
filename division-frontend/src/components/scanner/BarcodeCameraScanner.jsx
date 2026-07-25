import { useCallback, useEffect, useRef, useState } from 'react'

/** Minimum time between accepted detections — a BIB barcode stays in frame
 * across many decode attempts; without this the same scan fires repeatedly. */
const DETECT_COOLDOWN_MS = 1200

/**
 * Live-camera barcode scanner. Lazy-loads @zxing/browser only when mounted
 * (station pages that never open camera mode never pay for the bundle).
 * Falls back to a manual-entry prompt on permission-denied / no-camera /
 * decode-engine-load-failure — camera must never hard-block a scan station.
 *
 * @param {{
 *   active: boolean,
 *   onDetect: (text: string) => void,
 *   onFallback: () => void,
 * }} props
 */
function BarcodeCameraScanner({ active, onDetect, onFallback }) {
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const cooldownUntilRef = useRef(0)
  const [status, setStatus] = useState('starting') // starting | live | denied | error
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)

  const handleDetect = useCallback(
    (text) => {
      const now = Date.now()
      if (now < cooldownUntilRef.current) return
      cooldownUntilRef.current = now + DETECT_COOLDOWN_MS
      onDetect(text)
    },
    [onDetect],
  )

  useEffect(() => {
    if (!active) return undefined
    let cancelled = false

    setStatus('starting')

    import('@zxing/browser')
      .then(({ BrowserMultiFormatReader }) => {
        if (cancelled) return
        const reader = new BrowserMultiFormatReader()
        return reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          (result, _err, controls) => {
            if (cancelled) return
            controlsRef.current = controls
            if (result) handleDetect(result.getText())
          },
        )
      })
      .then((controls) => {
        if (cancelled) {
          controls?.stop()
          return
        }
        controlsRef.current = controls
        setStatus('live')
        const track = videoRef.current?.srcObject?.getVideoTracks?.()[0]
        setTorchSupported(Boolean(track?.getCapabilities?.().torch))
      })
      .catch((err) => {
        if (cancelled) return
        setStatus(err?.name === 'NotAllowedError' ? 'denied' : 'error')
      })

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
      setTorchOn(false)
    }
  }, [active, handleDetect])

  async function toggleTorch() {
    const track = videoRef.current?.srcObject?.getVideoTracks?.()[0]
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch {
      // torch toggle unsupported mid-stream on some devices — silently ignore
    }
  }

  if (!active) return null

  return (
    <div className="cam-scan">
      <video ref={videoRef} className="cam-scan__video" muted playsInline autoPlay />

      {status === 'live' && (
        <>
          <div className="cam-scan__frame" aria-hidden="true" />
          <p className="cam-scan__hint">เล็ง BIB ให้อยู่ในกรอบ</p>
          {torchSupported && (
            <button
              type="button"
              className={`cam-scan__torch ${torchOn ? 'is-on' : ''}`}
              onClick={toggleTorch}
              aria-pressed={torchOn}
              aria-label="เปิด/ปิดไฟฉาย"
            >
              💡
            </button>
          )}
        </>
      )}

      {status === 'starting' && <p className="cam-scan__status">กำลังเปิดกล้อง…</p>}

      {(status === 'denied' || status === 'error') && (
        <div className="cam-scan__fallback">
          <p>
            {status === 'denied'
              ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง'
              : 'เปิดกล้องไม่สำเร็จ'}
          </p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onFallback}>
            พิมพ์ BIB แทน
          </button>
        </div>
      )}
    </div>
  )
}

export default BarcodeCameraScanner
