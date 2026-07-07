import { useCallback, useMemo, useState } from 'react'
import { useRaceState } from './hooks/useRaceState'
import { useHashRoute } from './hooks/useHashRoute'
import { fmtTime, fmtTotal } from './lib/raceData'
import Sidebar from './components/sidebar/Sidebar'
import Toast from './components/ui/Toast'
import ESlipModal from './components/eslip/ESlipModal'
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

function App() {
  const [page, navigate] = useHashRoute()
  const race = useRaceState()
  const [notice, setNotice] = useState(null)
  const [slipBib, setSlipBib] = useState(null)

  const notify = useCallback((result) => {
    setNotice({ ...noticeFor(result), id: Date.now() })
  }, [])

  const { scanCheckin, scanCheckpoint, scanFinish } = race
  const onScanCheckin = useCallback((value) => notify(scanCheckin(value)), [notify, scanCheckin])
  const onScanCheckpoint = useCallback(
    (value, cpId) => notify(scanCheckpoint(value, cpId)),
    [notify, scanCheckpoint],
  )
  const onScanFinish = useCallback((value) => notify(scanFinish(value)), [notify, scanFinish])

  const slipRunner = useMemo(
    () => (slipBib ? race.runners.find((r) => r.bib === slipBib) ?? null : null),
    [slipBib, race.runners],
  )

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
