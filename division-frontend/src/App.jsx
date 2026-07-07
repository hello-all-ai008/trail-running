import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRaceState, USE_MOCK } from './hooks/useRaceState'
import { useHashRoute } from './hooks/useHashRoute'
import { fmtTime, fmtTotal } from './lib/raceData'
import * as api from './lib/api'
import Sidebar from './components/sidebar/Sidebar'
import Toast from './components/ui/Toast'
import ESlipModal from './components/eslip/ESlipModal'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RunnersPage from './pages/RunnersPage'
import StationPage from './pages/StationPage'
import ResultsPage from './pages/ResultsPage'
import ScanLogPage from './pages/ScanLogPage'

/** Toast message per scan outcome. */
function noticeFor(result) {
  const r = result.runner
  switch (result.outcome) {
    case 'ok':
      if (result.station === 'Finish')
        return { text: `🏁 Finish! BIB ${r.bib} ${r.name} — ${fmtTotal(r)}` }
      return { text: `✓ ${result.station} สำเร็จ — BIB ${r.bib} ${r.name}` }
    case 'duplicate':
      if (result.station === 'Check-in')
        return { text: `BIB ${r.bib} เช็คอินไปแล้วเมื่อ ${fmtTime(r.checkin)}`, error: true }
      if (result.station === 'Finish')
        return { text: `BIB ${r.bib} เข้าเส้นชัยแล้ว (ยึดเวลาแรก)`, error: true }
      return { text: `BIB ${r.bib} ผ่าน ${result.station} ไปแล้ว`, error: true }
    case 'not-checked-in':
      return { text: `BIB ${r.bib} ยังไม่ผ่าน Check-in`, error: true }
    default:
      return { text: 'ไม่พบ BIB ในฐานข้อมูล', error: true }
  }
}

/**
 * Real-backend auth gate. Mock mode never needs a session, so it resolves
 * to "signed in" immediately. Not a hook itself — used inside App's own
 * useState/useEffect below to keep the rules-of-hooks call order fixed
 * regardless of USE_MOCK (a build-time constant, not a runtime toggle).
 */
function useStaffSession() {
  const [session, setSession] = useState(() => (USE_MOCK ? null : undefined))

  useEffect(() => {
    if (USE_MOCK) return
    api.getSession().then(setSession)
    return api.onAuthChange(setSession)
  }, [])

  return session
}

function App() {
  const [page, navigate] = useHashRoute()
  const session = useStaffSession()
  const race = useRaceState()
  const [notice, setNotice] = useState(null)
  const [slipBib, setSlipBib] = useState(null)

  const notify = useCallback((result) => {
    setNotice({ ...noticeFor(result), id: Date.now() })
  }, [])

  const { scanCheckin, scanCheckpoint, scanFinish } = race
  const onScanCheckin = useCallback((value) => { scanCheckin(value).then(notify) }, [notify, scanCheckin])
  const onScanCheckpoint = useCallback(
    (value, cpId) => { scanCheckpoint(value, cpId).then(notify) },
    [notify, scanCheckpoint],
  )
  const onScanFinish = useCallback((value) => { scanFinish(value).then(notify) }, [notify, scanFinish])

  const slipRunner = useMemo(
    () => (slipBib ? race.runners.find((r) => r.bib === slipBib) ?? null : null),
    [slipBib, race.runners],
  )

  if (!USE_MOCK && session === undefined) return null
  if (!USE_MOCK && !session) return <LoginPage onSignedIn={() => {}} />

  return (
    <div className="app">
      <Sidebar page={page} onNavigate={navigate} />

      <main className="app__main">
        {page === 'dashboard' && (
          <DashboardPage runners={race.runners} stats={race.stats} finishers={race.finishers} />
        )}
        {page === 'runners' && <RunnersPage runners={race.runners} />}
        {page === 'checkin' && (
          <StationPage stationKey="checkin" scanLog={race.scanLog} lastScan={race.lastScan.checkin} onScan={onScanCheckin} />
        )}
        {page === 'checkpoint' && (
          <StationPage stationKey="checkpoint" scanLog={race.scanLog} lastScan={race.lastScan.checkpoint} onScan={onScanCheckpoint} />
        )}
        {page === 'finish' && (
          <StationPage stationKey="finish" scanLog={race.scanLog} lastScan={race.lastScan.finish} onScan={onScanFinish} />
        )}
        {page === 'results' && (
          <ResultsPage finishers={race.finishers} ranks={race.ranks} onOpenSlip={setSlipBib} />
        )}
        {page === 'log' && <ScanLogPage scanLog={race.scanLog} />}
      </main>

      <Toast notice={notice} />
      {slipRunner && <ESlipModal runner={slipRunner} ranks={race.ranks} onClose={() => setSlipBib(null)} />}
    </div>
  )
}

export default App
