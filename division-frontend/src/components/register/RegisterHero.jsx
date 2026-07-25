import { CATEGORIES } from '../../lib/raceData'

const CATEGORY_META = {
  MKT33: { distance: '33 กม.', gain: '+1,900 ม.', tag: 'ระยะกลาง' },
  MKT50: { distance: '50 กม.', gain: '+3,200 ม.', tag: 'ระยะไกล' },
}

/**
 * Public landing hero for the pre-race registration surface. Sets the trail
 * atmosphere with layered CSS mesh (no image assets) and presents the two
 * race categories as distinct glass cards.
 */
function RegisterHero() {
  return (
    <header className="reg-hero">
      <div className="reg-hero__mesh" aria-hidden="true" />

      <div className="reg-hero__intro">
        <span className="eyebrow">TrailTime · เปิดรับสมัคร</span>
        <h1 className="reg-hero__title">
          Baan Pong Cross Country
          <span className="reg-hero__title-accent">Mae Kha Nin</span>
        </h1>
        <p className="reg-hero__meta">
          <span>15 กันยายน 2567</span>
          <span className="reg-hero__dot" aria-hidden="true">•</span>
          <span>บ้านโป่ง เชียงใหม่</span>
        </p>
        <p className="reg-hero__lead">
          วิ่งเทรลข้ามภูเขาผ่านเส้นทางป่าต้นน้ำแม่ขะนิน เลือกระยะที่ใช่
          แล้วกรอกใบสมัครด้านล่าง เจ้าหน้าที่จะติดต่อกลับเพื่อยืนยันสิทธิ์
        </p>
      </div>

      <ul className="reg-hero__cards">
        {CATEGORIES.map((cat, i) => {
          const meta = CATEGORY_META[cat]
          return (
            <li key={cat} className="glass-panel reg-cat" data-index={i}>
              <span className="reg-cat__tag">{meta.tag}</span>
              <span className="reg-cat__code">{cat}</span>
              <span className="reg-cat__distance">{meta.distance}</span>
              <span className="reg-cat__gain">ระยะสะสมความสูง {meta.gain}</span>
            </li>
          )
        })}
      </ul>
    </header>
  )
}

export default RegisterHero
