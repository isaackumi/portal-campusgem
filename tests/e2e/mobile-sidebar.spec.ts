import { test, expect } from '@playwright/test'

const TEST_USER = {
  id: 'playwright-test-admin',
  full_name: 'Playwright Admin',
  role: 'admin',
  auth_uid: 'playwright-auth',
  phone: '0240000000',
  membership_id: 'CG-2026-0001',
}

test.describe('mobile sidebar', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([
      {
        name: 'chms-auth-session',
        value: TEST_USER.auth_uid,
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'chms-role',
        value: 'admin',
        domain: 'localhost',
        path: '/',
      },
    ])

    await page.addInitScript((user) => {
      localStorage.setItem('campus_gem_test_user', JSON.stringify(user))
    }, TEST_USER)
  })

  test('drawer renders above dashboard content', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)

    const menuButton = page.getByRole('button', { name: 'Open menu' })
    await expect(menuButton).toBeVisible({ timeout: 15_000 })

    await menuButton.click()

    const drawer = page.getByRole('dialog', { name: 'Navigation' })
    await expect(drawer).toBeVisible()

    const overlayZ = await drawer.evaluate((el) => Number(getComputedStyle(el).zIndex))
    expect(overlayZ).toBeGreaterThanOrEqual(9999)

    const panel = drawer.locator('.mobile-nav-panel')
    await expect(panel).toBeVisible()
    await expect(panel).toHaveCSS('background-color', 'rgb(2, 6, 23)')

    await expect(drawer.getByText('Playwright Admin')).toBeVisible()
    await expect(drawer.getByText('Dashboard')).toBeVisible()

    const dashboardCard = page.getByText('Member Tracking & Follow-up')
    if ((await dashboardCard.count()) > 0) {
      const box = await dashboardCard.boundingBox()
      if (box) {
        const topElement = await page.evaluate(({ x, y }) => {
          const el = document.elementFromPoint(x, y)
          return el?.closest('[role="dialog"]')?.getAttribute('aria-label') ?? ''
        }, { x: box.x + 10, y: box.y + 10 })
        expect(topElement).toBe('Navigation')
      }
    }

    await drawer.getByRole('button', { name: 'Close menu' }).click()
    await expect(drawer).toBeHidden()
  })
})
