import { describe, expect, it } from '@jest/globals'
import { sidebarNavigationSections } from '@/lib/navigation/sidebar'

describe('sidebar navigation — RLC visitors only', () => {
  const main = sidebarNavigationSections.find((section) => section.title === 'Main')
  const rlc = sidebarNavigationSections.find((section) => section.title === 'RLC')

  it('does not list visitors under Main', () => {
    expect(main).toBeDefined()
    const names = main!.items.map((item) => item.name.toLowerCase())
    expect(names.some((name) => name.includes('visitor'))).toBe(false)
    expect(main!.items.some((item) => item.href.includes('/visitors'))).toBe(false)
  })

  it('lists RLC visitors under the RLC section with RLC data routes', () => {
    expect(rlc).toBeDefined()
    const visitors = rlc!.items.find((item) => item.href === '/admin/rlc/visitors')
    expect(visitors).toBeDefined()
    expect(visitors?.permission).toBe('rlc.view')
  })
})
