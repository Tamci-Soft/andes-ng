import { expect, test } from '@playwright/test';

test('renders the public Andes button contract', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Andes NG Playground/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('API estable');
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
});
