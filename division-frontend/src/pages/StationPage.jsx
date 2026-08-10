import { useEffect, useRef, useState } from 'react'
import LedBoard from '../components/led/LedBoard'
import BarcodeCameraScanner from '../components/scanner/BarcodeCameraScanner'
import { CHECKPOINTS, cpName, fmtTime, STATIONS } from '../lib/raceData'

/** Station configs — one shared page drives all three scan stations. */
const STATION_CONFIG = {
  checkin: {
    tagClass: 'tag--start',
    tagLabel: 'Station · Start',
    title: 'Check-in จุดปล่อยตัว',
    desc: 'ยิงบาร์โค้ดบน BIB หรือพิมพ์หมายเลขแล้วกด Enter — ระบบบันทึกเวลาเช็คอินอัตโนมัติ',
    hint: 'เครื่องยิงบาร์โค้ดจะพิมพ์หมายเลขและกด Enter ให้อัตโนมัติ · โฟกัสค้างที่ช่องนี้เสมอ',
    hasCpSelect: false,
  },
  checkpoint: {
    tagClass: 'tag--cp',
    tagLabel: 'Station · Check Point',
    title: 'Check Point ระหว่างเส้นทาง',
    desc: 'เลือกจุดเช็คพอยต์ที่เจ้าหน้าที่ประจำอยู่ แล้วยิงบาร์โค้ดนักวิ่งที่ผ่านจุด',
    hint: 'นักวิ่งต้องผ่าน Check-in ก่อน จึงจะบันทึกเวลาที่จุดนี้ได้',
    hasCpSelect: true,
  },
  finish: {
    tagClass: 'tag--finish',
    tagLabel: 'Station · Finish',
    title: 'Finish Line เส้นชัย',
    desc: 'ยิงบาร์โค้ดเมื่อนักวิ่งเข้าเส้นชัย ระบบคำนวณ Total Time และจัดอันดับให้ทันที',
    hint: 'สแกนซ้ำจะไม่ทับเวลาเดิม — ยึดเวลา Finish ครั้งแรกเสมอ',
    hasCpSelect: false,
  },
}

const SCAN_MODE_KEY = 'trailtime-scan-mode'

/** Touch-primary devices (phones) default to camera; mouse/USB-scanner desktops keep the keyboard flow. */
function defaultScanMode() {
  const saved = localStorage.getItem(SCAN_MODE_KEY)
  if (saved === 'camera' || saved === 'keyboard') return saved
  return window.matchMedia?.('(pointer: coarse)').matches ? 'camera' : 'keyboard'
}

/** Which log-station names belong to this page's recent-scans table. */
function stationFilter(stationKey, cpId) {
  if (stationKey === 'checkin') return (entry) => entry.station === STATIONS.CHECKIN
  if (stationKey === 'finish') return (entry) => entry.station === STATIONS.FINISH
  return (entry) => entry.station === cpName(cpId) || CHECKPOINTS.some((c) => entry.station === c.name)
}

/**
 * Scan station page — camera scan (phone) or barcode-scanner-as-keyboard
 * (desk with USB/BT scanner) feed the same submit path, LED board, recent
 * scans at this station.
 * @param {{
 *   stationKey: 'checkin'|'checkpoint'|'finish',
 *   scanLog: Array<import('../lib/raceEngine').LogEntry>,
 *   lastScan: import('../lib/raceEngine').ScanResult | undefined,
 *   onScan: (value: string, cpId?: string) => void
 * }} props
 */
function StationPage({ stationKey, scanLog, lastScan, onScan }) {
  const config = STATION_CONFIG[stationKey]
  const [value, setValue] = useState('')
  const [cpId, setCpId] = useState(CHECKPOINTS[0]?.id ?? '')
  const [mode, setMode] = useState(defaultScanMode)
  const inputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(SCAN_MODE_KEY, mode)
  }, [mode])

  // barcode scanners expect a focused input — autofocus on page entry (keyboard mode only)
  useEffect(() => {
    if (mode !== 'keyboard') return undefined
    const id = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(id)
  }, [stationKey, mode])

  function submit(overrideValue) {
    const scanned = (overrideValue ?? value).trim()
    if (!scanned) return
    onScan(scanned, cpId)
    setValue('')
  }

  const recent = scanLog.filter(stationFilter(stationKey, cpId)).slice(0, 8)
  const noCheckpointsConfigured = config.hasCpSelect && CHECKPOINTS.length === 0

  return (
    <section aria-labelledby={`station-${stationKey}-heading`}>
      <header className="page-head">
        <span className={`station-tag ${config.tagClass}`}>
          <span className="station-tag__dot" aria-hidden="true" />
          {config.tagLabel}
        </span>
        <h1 id={`station-${stationKey}-heading`}>{config.title}</h1>
        <p>{config.desc}</p>
      </header>

      <div className="station">
        <div className="station__scan">
          {noCheckpointsConfigured ? (
            <p className="empty">ยังไม่มีการตั้งค่า Check Point สำหรับ event นี้ — รอเจ้าหน้าที่กำหนดจุดก่อนเริ่มสแกน</p>
          ) : (
            <>
              <div className="toolbar">
                {config.hasCpSelect && (
                  <select className="search search--select" value={cpId} onChange={(e) => setCpId(e.target.value)} aria-label="Select checkpoint">
                    {CHECKPOINTS.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                <div className="scan-mode-toggle" role="group" aria-label="วิธีสแกน">
                  <button
                    type="button"
                    className={`btn btn-sm ${mode === 'camera' ? 'btn-accent' : 'btn-secondary'}`}
                    aria-pressed={mode === 'camera'}
                    onClick={() => setMode('camera')}
                  >
                    📷 สแกนด้วยกล้อง
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${mode === 'keyboard' ? 'btn-accent' : 'btn-secondary'}`}
                    aria-pressed={mode === 'keyboard'}
                    onClick={() => setMode('keyboard')}
                  >
                    ⌨️ พิมพ์ BIB
                  </button>
                </div>
              </div>

              {mode === 'camera' ? (
                <BarcodeCameraScanner
                  active={mode === 'camera'}
                  onDetect={(text) => submit(text)}
                  onFallback={() => setMode('keyboard')}
                />
              ) : (
                <div className="scan-input-wrap">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                    <path d="M7 8v8M11 8v8M15 8v6M18 8v8" strokeWidth="1.6" />
                  </svg>
                  <input
                    ref={inputRef}
                    className="scan-input"
                    placeholder="สแกน BIB Barcode…"
                    autoComplete="off"
                    inputMode="numeric"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submit()
                    }}
                    aria-label="Scan BIB"
                  />
                </div>
              )}
              <p className="scan-hint">{mode === 'camera' ? 'เล็งกล้องไปที่บาร์โค้ดบน BIB ให้อยู่ในกรอบ' : config.hint}</p>
            </>
          )}
        </div>

        <LedBoard className="station__led" result={lastScan} />

        <div className="glass-panel table-wrap station__recent">
          <table className="data-table">
            <thead>
              <tr><th>เวลา</th><th>BIB</th><th>ชื่อ</th><th>ผลลัพธ์</th></tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={4} className="empty">ยังไม่มีการสแกนที่จุดนี้</td></tr>
              ) : (
                recent.map((entry, i) => (
                  <tr key={`${entry.time}-${entry.bib}-${i}`}>
                    <td className="mono">{fmtTime(entry.time)}</td>
                    <td className="mono"><b>{entry.bib}</b></td>
                    <td>{entry.name}</td>
                    <td>
                      {entry.ok ? (
                        <span className="scan-ok">✓ สำเร็จ</span>
                      ) : (
                        <span className="scan-bad">✕ {entry.msg || 'ไม่สำเร็จ'}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default StationPage
