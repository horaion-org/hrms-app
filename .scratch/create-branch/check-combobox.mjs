import { chromium, firefox, webkit, expect } from '@playwright/test';
for (const engine of [chromium, firefox, webkit]) {
const browser = await engine.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 640 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
 await page.goto('http://localhost:6006/iframe.html?id=forms-combobox--long-list-near-bottom&viewMode=story');
 const trigger = page.getByRole('button', { name: 'Branch heads', exact: true });
 await trigger.waitFor();
 await trigger.focus();
 await page.keyboard.press('Enter');
 const search = page.getByRole('combobox', { name: 'Search people' });
 await expect(search).toBeFocused();
 const list = page.getByRole('listbox');
 const panel = list.locator('..');
 await expect(panel).toBeVisible();
 await expect.poll(async () => { const bounds = await panel.boundingBox(); return bounds.y + bounds.height; }).toBeLessThanOrEqual(640);
 const box = await panel.boundingBox();
 const triggerBox = await trigger.boundingBox();
 expect(box.y).toBeGreaterThanOrEqual(0);
 expect(box.y + box.height).toBeLessThanOrEqual(640);
 expect(box.x + box.width).toBeLessThanOrEqual(390);
 expect(box.y).toBeLessThan(triggerBox.y);
 await page.keyboard.press('Enter');
 await expect(page.getByRole('button', { name: 'Remove Person 1', exact: true })).toBeVisible();
 await expect(list).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(trigger).toBeFocused();
 await page.screenshot({ path: '.scratch/create-branch/design/combobox-mobile-tokens.png' });
 await trigger.click();
 await page.screenshot({ path: '.scratch/create-branch/design/combobox-mobile-flipped.png' });
 expect(errors).toEqual([]);
 console.log(JSON.stringify({browser:engine.name(),panel:box,trigger:triggerBox,pageErrors:errors},null,2));
} finally { await browser.close(); }
}
