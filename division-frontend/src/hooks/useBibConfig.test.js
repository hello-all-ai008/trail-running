import { describe, it, expect } from 'vitest'
import { migrateElements, defaultConfig } from './useBibConfig'

describe('migrateElements', () => {
  it('passes through a config that already has elements unchanged', () => {
    const elements = [{ id: 'a', type: 'text' }]
    expect(migrateElements({ elements })).toEqual({ elements })
  })

  it('converts a pre-freeform headerImage into a top-pinned image element', () => {
    const { elements } = migrateElements({ headerImage: 'data:image/png;base64,AAA', footerImage: null })
    const header = elements.find((el) => el.type === 'image')
    expect(header).toBeDefined()
    expect(header.src).toBe('data:image/png;base64,AAA')
    expect(header.yPct).toBe(0)
  })

  it('converts a pre-freeform footerImage into a bottom-pinned image element', () => {
    const { elements } = migrateElements({ headerImage: null, footerImage: 'data:image/png;base64,BBB' })
    const footer = elements.find((el) => el.type === 'image')
    expect(footer).toBeDefined()
    expect(footer.src).toBe('data:image/png;base64,BBB')
    expect(footer.yPct + footer.hPct).toBeCloseTo(100)
  })

  it('still seeds the structural elements when no banners are set', () => {
    const { elements } = migrateElements({ headerImage: null, footerImage: null })
    expect(elements.some((el) => el.type === 'bibNumber')).toBe(true)
    expect(elements.filter((el) => el.type === 'checkpointBox')).toHaveLength(6)
    expect(elements.some((el) => el.type === 'image')).toBe(false)
  })

  it('does not drop either uploaded banner during migration', () => {
    const { elements } = migrateElements({
      headerImage: 'data:image/png;base64,HEADER',
      footerImage: 'data:image/png;base64,FOOTER',
    })
    const images = elements.filter((el) => el.type === 'image')
    expect(images).toHaveLength(2)
  })
})

describe('defaultConfig', () => {
  it('seeds each category prefix as the first digit of its distance', () => {
    const { categories } = defaultConfig()
    for (const cat of categories) {
      expect(cat.prefix).toBe(String(cat.distanceKm)[0])
    }
  })

  it('matches the 50km/33km reference examples', () => {
    const { categories } = defaultConfig()
    const km50 = categories.find((cat) => cat.distanceKm === 50)
    const km33 = categories.find((cat) => cat.distanceKm === 33)
    if (km50) expect(km50.prefix).toBe('5')
    if (km33) expect(km33.prefix).toBe('3')
  })
})
