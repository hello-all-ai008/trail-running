/**
 * Glass navigation rail — mockup_2 structure (nav groups + station color dots),
 * liquid-glass skin. Collapses to icon rail ≤960px.
 */

const NAV = [
  { group: 'ภาพรวม' },
  { page: 'dashboard', label: 'แดชบอร์ด', icon: 'grid' },
  { page: 'runners', label: 'รายชื่อนักวิ่ง', icon: 'users' },
  { group: 'จุดสแกน' },
  { page: 'checkin', label: 'Check-in (Start)', dot: 'var(--station-start)' },
  { page: 'checkpoint', label: 'Check Point', dot: 'var(--station-cp)' },
  { page: 'finish', label: 'Finish Line', dot: 'var(--station-finish)' },
  { group: 'รายงาน' },
  { page: 'monitor', label: 'Live Monitor', icon: 'monitor' },
  { page: 'results', label: 'ผลการแข่งขัน', icon: 'trophy' },
  { page: 'log', label: 'Scan Log', icon: 'clock' },
]

const ICONS = {
  grid: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  users: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  trophy: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M17 4H7v5a5 5 0 0 0 10 0V4z" />
      <path d="M17 6h3a1 1 0 0 1 1 1c0 2.5-2 4-4 4" />
      <path d="M7 6H4a1 1 0 0 0-1 1c0 2.5 2 4 4 4" />
    </svg>
  ),
  clock: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  monitor: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M8 12l2.5-3 3 4L17 8" />
    </svg>
  ),
}

/**
 * @param {{ page: string, onNavigate: (page: string) => void }} props
 */
function Sidebar({ page, onNavigate }) {
  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar__logo">
        <div className="sidebar__mark" aria-hidden="true">TT</div>
        <div className="sidebar__brand">
          <b>TrailTime</b>
          <span>Race Timing System</span>
        </div>
      </div>

      <nav aria-label="Main navigation" className="sidebar__nav">
        {NAV.map((item, i) =>
          item.group ? (
            <span key={`g-${i}`} className="sidebar__group">{item.group}</span>
          ) : (
            <button
              key={item.page}
              type="button"
              className={`sidebar__item ${page === item.page ? 'is-active' : ''}`}
              onClick={() => onNavigate(item.page)}
            >
              {item.dot ? (
                <span className="sidebar__dot" style={{ background: item.dot }} aria-hidden="true" />
              ) : (
                ICONS[item.icon]
              )}
              <span className="sidebar__label">{item.label}</span>
            </button>
          ),
        )}
      </nav>

      <button type="button" className="sidebar__preview-link" onClick={() => onNavigate('register')}>
        ดูตัวอย่างหน้าลงทะเบียน
      </button>
    </aside>
  )
}

export default Sidebar
