import { test, expect } from '@playwright/test';

test.describe('Discover Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user session
    await page.route('/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        json: { user: { id: 'user-1', name: 'Tester', isOnboarded: true } }
      });
    });

    // Mock Groups API
    await page.route('/api/groups', async (route) => {
      await route.fulfill({
        status: 200,
        json: { data: [] }
      });
    });

    // Mock Discover API (Page 1)
    await page.route('**/api/matching/discover?page=1&limit=20', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          data: [
            {
              user: { id: 'match-1', name: 'Alice', age: 25, travelStyle: 'cultural' },
              compatibility: { overallScore: 92, trustScore: 95 }
            }
          ],
          pagination: { page: 1, limit: 20, totalPages: 2 }
        }
      });
    });

    // Mock Discover API (Page 2)
    await page.route('**/api/matching/discover?page=2&limit=20', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          data: [
            {
              user: { id: 'match-2', name: 'Bob', age: 30, travelStyle: 'adventure' },
              compatibility: { overallScore: 85, trustScore: 75 }
            }
          ],
          pagination: { page: 2, limit: 20, totalPages: 2 }
        }
      });
    });
  });

  test('should display matches and paginate', async ({ page }) => {
    await page.goto('/discover');

    // Wait for first match to appear
    await expect(page.getByText('Alice')).toBeVisible();

    // Click Load More
    await page.getByRole('button', { name: /LOAD MORE TRAVELERS/i }).click();

    // Bob should now appear
    await expect(page.getByText('Bob')).toBeVisible();
  });

  test('should block a user and remove them from feed', async ({ page }) => {
    await page.goto('/discover');

    // Click on Alice to open modal
    await page.getByText('Alice').click();

    // Inside modal, there is Report / Block User
    await expect(page.getByText(/Report \/ Block User/i)).toBeVisible();

    // Mock window.confirm to auto-accept
    page.on('dialog', dialog => dialog.accept());

    // Click block
    await page.getByText(/Report \/ Block User/i).click();

    // Modal should close and Alice should be removed
    await expect(page.getByText('User blocked successfully')).toBeVisible();
    await expect(page.getByText('Alice')).toBeHidden();
  });

  test('should pre-fill group creation flow', async ({ page }) => {
    await page.goto('/discover');

    // Open Alice's modal
    await page.getByText('Alice').click();

    // Click Form Travel Group
    await page.getByRole('button', { name: /FORM TRAVEL GROUP/i }).click();

    // Focus should move to group name input (or at least a message should appear)
    await expect(page.getByText(/Start planning! Form a group and invite Alice/i)).toBeVisible();
  });
});
