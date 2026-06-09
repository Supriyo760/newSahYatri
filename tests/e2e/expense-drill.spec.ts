import { test, expect } from '@playwright/test';

test.describe('Expense Minor-Unit Drill', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user session
    await page.route('/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        json: { user: { id: 'user-1', name: 'Tester' } }
      });
    });

    // Mock expenses GET
    await page.route('/api/trips/trip-1/expenses', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            data: [
              {
                id: 'exp-1',
                description: 'Dinner',
                amountMinorUnits: 3333, // $33.33
                paidById: 'user-1',
                currency: 'USD',
                splits: [
                  { userId: 'user-1', amountMinorUnits: 1111 }, // $11.11
                  { userId: 'user-2', amountMinorUnits: 1111 }, // $11.11
                  { userId: 'user-3', amountMinorUnits: 1111 }, // $11.11
                ]
              }
            ]
          }
        });
      } else {
        // POST mock
        await route.fulfill({
          status: 201,
          json: { data: { success: true } }
        });
      }
    });

    // Mock group data for names
    await page.route('/api/groups/group-1', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            id: 'group-1',
            status: 'active',
            members: [
              { userId: 'user-1', user: { name: 'Tester' } },
              { userId: 'user-2', user: { name: 'Alice' } },
              { userId: 'user-3', user: { name: 'Bob' } }
            ],
            trips: [{ id: 'trip-1' }]
          }
        }
      });
    });
  });

  test('should display balances correctly without floating point errors', async ({ page }) => {
    await page.goto('/groups/group-1'); // Assuming there's an expenses tab or section

    // The UI should fetch expenses and calculate balances
    // Tester paid 33.33. Tester owes 11.11. Net = +22.22
    // Alice owes 11.11. Net = -11.11
    // Bob owes 11.11. Net = -11.11

    // We expect the UI to format this as $22.22, -$11.11, -$11.11
    await expect(page.getByText('+$22.22').first()).toBeVisible();
    await expect(page.getByText('-$11.11')).toHaveCount(2);
  });

  test('should submit a new expense', async ({ page }) => {
    await page.goto('/groups/group-1');

    // Click Add Expense
    await page.getByRole('button', { name: /Add Expense/i }).click();

    // Fill form
    await page.getByLabel(/Description/i).fill('Taxi');
    await page.getByLabel(/Amount/i).fill('45.00');
    
    // Submit
    await page.getByRole('button', { name: /Save Expense/i }).click();

    // Should close modal and maybe show success
    await expect(page.getByText(/Expense added/i)).toBeVisible();
  });
});
