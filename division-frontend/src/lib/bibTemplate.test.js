import { describe, it, expect } from 'vitest'
import {
  pctToPtX,
  pctToPtY,
  boxToPt,
  checkpointBoxLabel,
  visibleElements,
  defaultStructuralElements,
  isRemovableElement,
  CHECKPOINT_ROLES,
  TAG_WIDTH_PT,
  TAG_HEIGHT_PT,
} from './bibTemplate'

describe('pctToPtX / pctToPtY', () => {
  it('converts 0% and 100% to the tag bounds', () => {
    expect(pctToPtX(0)).toBe(0)
    expect(pctToPtX(100)).toBeCloseTo(TAG_WIDTH_PT)
    expect(pctToPtY(0)).toBe(0)
    expect(pctToPtY(100)).toBeCloseTo(TAG_HEIGHT_PT)
  })

  it('converts 50% to the midpoint', () => {
    expect(pctToPtX(50)).toBeCloseTo(TAG_WIDTH_PT / 2)
    expect(pctToPtY(50)).toBeCloseTo(TAG_HEIGHT_PT / 2)
  })
})

describe('boxToPt', () => {
  it('converts a pct box to a pt box on both axes independently', () => {
    const pt = boxToPt({ xPct: 10, yPct: 20, wPct: 30, hPct: 40 })
    expect(pt.left).toBeCloseTo(pctToPtX(10))
    expect(pt.top).toBeCloseTo(pctToPtY(20))
    expect(pt.width).toBeCloseTo(pctToPtX(30))
    expect(pt.height).toBeCloseTo(pctToPtY(40))
  })
})

describe('checkpointBoxLabel', () => {
  it('labels start and finish regardless of checkpointCount', () => {
    expect(checkpointBoxLabel('start', 2)).toBe('Start')
    expect(checkpointBoxLabel('finish', 2)).toBe('Finish')
  })

  it('labels a single checkpoint generically', () => {
    expect(checkpointBoxLabel('cp1', 1)).toBe('Check Point')
  })

  it('labels multiple checkpoints numerically', () => {
    expect(checkpointBoxLabel('cp1', 3)).toBe('CP1')
    expect(checkpointBoxLabel('cp2', 3)).toBe('CP2')
    expect(checkpointBoxLabel('cp3', 3)).toBe('CP3')
  })

  it('returns an empty label for a role beyond the current checkpointCount', () => {
    expect(checkpointBoxLabel('cp3', 1)).toBe('')
  })
})

describe('visibleElements', () => {
  const elements = defaultStructuralElements()

  it('always includes start, finish, and the bib number', () => {
    const visible = visibleElements(elements, 1)
    expect(visible.some((el) => el.role === 'start')).toBe(true)
    expect(visible.some((el) => el.role === 'finish')).toBe(true)
    expect(visible.some((el) => el.type === 'bibNumber')).toBe(true)
  })

  it('shows only cp1 when checkpointCount is 1', () => {
    const visible = visibleElements(elements, 1)
    const cpRoles = visible
      .filter((el) => el.type === 'checkpointBox' && el.role.startsWith('cp'))
      .map((el) => el.role)
    expect(cpRoles).toEqual(['cp1'])
  })

  it('shows cp1-cp4 when checkpointCount is 4', () => {
    const visible = visibleElements(elements, 4)
    const cpRoles = visible
      .filter((el) => el.type === 'checkpointBox' && el.role.startsWith('cp'))
      .map((el) => el.role)
    expect(cpRoles).toEqual(['cp1', 'cp2', 'cp3', 'cp4'])
  })

  it('keeps every non-checkpointBox element regardless of checkpointCount', () => {
    const withExtra = [...elements, { id: 'img1', type: 'image' }]
    const visible = visibleElements(withExtra, 1)
    expect(visible.some((el) => el.id === 'img1')).toBe(true)
  })

  it('shows only start and finish when checkpointCount is 0', () => {
    const visible = visibleElements(elements, 0)
    const cpRoles = visible.filter((el) => el.type === 'checkpointBox' && el.role.startsWith('cp'))
    expect(cpRoles).toHaveLength(0)
    expect(visible.some((el) => el.role === 'start')).toBe(true)
    expect(visible.some((el) => el.role === 'finish')).toBe(true)
  })
})

describe('isRemovableElement', () => {
  it('allows removing image and text elements', () => {
    expect(isRemovableElement({ type: 'image' })).toBe(true)
    expect(isRemovableElement({ type: 'text' })).toBe(true)
  })

  it('allows removing start and finish checkpoint boxes only', () => {
    expect(isRemovableElement({ type: 'checkpointBox', role: 'start' })).toBe(true)
    expect(isRemovableElement({ type: 'checkpointBox', role: 'finish' })).toBe(true)
    expect(isRemovableElement({ type: 'checkpointBox', role: 'cp1' })).toBe(false)
    expect(isRemovableElement({ type: 'checkpointBox', role: 'cp4' })).toBe(false)
  })

  it('never allows removing the bib number', () => {
    expect(isRemovableElement({ type: 'bibNumber' })).toBe(false)
  })
})

describe('defaultStructuralElements', () => {
  it('produces exactly one bibNumber and one checkpointBox per role', () => {
    const elements = defaultStructuralElements()
    expect(elements.filter((el) => el.type === 'bibNumber')).toHaveLength(1)
    expect(elements.filter((el) => el.type === 'checkpointBox')).toHaveLength(CHECKPOINT_ROLES.length)
  })

  it('keeps every element within the 0-100 pct canvas bounds', () => {
    const elements = defaultStructuralElements()
    for (const el of elements) {
      expect(el.xPct).toBeGreaterThanOrEqual(0)
      expect(el.xPct + el.wPct).toBeLessThanOrEqual(100)
      expect(el.yPct).toBeGreaterThanOrEqual(0)
      expect(el.yPct + el.hPct).toBeLessThanOrEqual(100)
    }
  })
})
