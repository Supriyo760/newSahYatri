import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the session API to return a valid but non-onboarded user
    await page.route('/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          user: {
            id: 'mock-user-123',
            name: 'Test User',
            email: 'test@example.com',
            isOnboarded: false
          }
        }
      });
    });

    // Mock the onboarding submission
    await page.route('/api/users/onboarding', async (route) => {
      await route.fulfill({
        status: 200,
        json: { data: { success: true } }
      });
    });
  });

  test('should complete the 3-step onboarding wizard', async ({ page }) => {
    // Go to onboarding page
    await page.goto('/onboarding');
    await expect(page).toHaveTitle(/Onboarding/i);

    // STEP 1: Personal Details
    await expect(page.getByText('Step 1 of 3: Personal Details')).toBeVisible();
    
    // Fill out form
    await page.getByLabel(/Age/i).fill('28');
    await page.getByLabel(/Gender/i).selectOption('male');
    await page.getByLabel(/Nationality/i).fill('American');

    // Click Next
    await page.getByRole('button', { name: /Next Step/i }).click();

    // STEP 2: Personality Profile
    await expect(page.getByText('Step 2 of 3: Personality Profile')).toBeVisible();

    await page.getByLabel(/Travel Style/i).selectOption('adventure');
    await page.getByLabel(/Budget Level/i).selectOption('mid-range');
    await page.getByLabel(/Risk Tolerance/i).selectOption('medium');

    await page.getByRole('button', { name: /Next Step/i }).click();

    // STEP 3: Medical & Emergency
    await expect(page.getByText('Step 3 of 3: Medical & Emergency')).toBeVisible();

    await page.getByLabel(/Blood Type/i).fill('O+');
    
    // Fill first emergency contact
    await page.getByPlaceholder(/Name/).first().fill('Jane Doe');
    await page.getByPlaceholder(/Phone/).first().fill('+1234567890');
    await page.getByPlaceholder(/Relationship/).first().fill('Sister');

    // Submit the form
    await page.getByRole('button', { name: /Complete Profile/i }).click();

    // Wait for redirect to discover
    await page.waitForURL('**/discover');
    await expect(page.url()).toContain('/discover');
  });

  test('should prevent proceeding without mandatory fields', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Leave Age empty and try to proceed
    await page.getByRole('button', { name: /Next Step/i }).click();
    
    // HTML5 validation or manual validation should block it, so we shouldn't see Step 2
    await expect(page.getByText('Step 2 of 3')).toBeHidden();
  });
});
