import { test, expect } from '@playwright/test';

test.describe('SOS Drill', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user session
    await page.route('/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        json: { user: { id: 'user-1', name: 'Tester', isOnboarded: true } }
      });
    });

    // Mock group data
    await page.route('/api/groups/group-1', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            id: 'group-1',
            name: 'Everest Base Camp',
            status: 'active',
            members: [
              { userId: 'user-1', role: 'creator', user: { name: 'Tester' } }
            ]
          }
        }
      });
    });

    // Mock the SOS API endpoint
    await page.route('/api/groups/group-1/sos', async (route) => {
      await route.fulfill({
        status: 200,
        json: { data: { success: true } }
      });
    });
  });

  test('should trigger SOS and show confirmation', async ({ page }) => {
    // Navigate to group page
    await page.goto('/groups/group-1');

    // Make sure we are on the dashboard
    await expect(page.getByText('Everest Base Camp')).toBeVisible();

    // Click the Emergency SOS button
    await page.getByRole('button', { name: /EMERGENCY SOS/i }).click();

    // In a real app with Geolocation API, we'd need to mock the geolocation.
    // For this drill, let's mock it using CDP or assume the app falls back to a default location if denied.
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 27.9881, longitude: 86.9250 }); // Everest

    // After clicking SOS, a confirmation modal might appear (if implemented), or it just triggers.
    // Let's assume it has a window.confirm or a UI modal. Let's mock window confirm just in case.
    page.on('dialog', dialog => dialog.accept());

    // Actually, in our UI, it says "Activating SOS will alert all members... Proceed?"
    // Let's assume the button triggers a confirmation modal or directly fires.
    // Wait for the success message to appear (from our mock).
    await expect(page.getByText(/SOS Alert Sent/i).or(page.getByText(/Emergency contacts notified/i))).toBeVisible({ timeout: 10000 });
  });
});
