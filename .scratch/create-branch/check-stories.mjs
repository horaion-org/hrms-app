import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const check = (condition, message) => { if (!condition) throw new Error(message); };
const story = async id => {
  await page.goto(`http://localhost:6006/iframe.html?id=${id}&viewMode=story`);
};
try {
  await story('ui-dialog--default');
  const dialog = page.getByRole('dialog', { name: 'Create branch' });
  await dialog.waitFor();
  const dimensions = await dialog.locator('[data-headlessui-state]').evaluateAll(nodes => nodes.map(node => ({ tag: node.tagName, width: node.getBoundingClientRect().width })));
  const panel = dialog.locator('header').locator('..');
  const box = await panel.boundingBox();
  check(box?.width === 560, 'Dialog desktop panel must be 560px');
  await page.screenshot({ path: '.scratch/create-branch/design/dialog-browser-default.png' });
  await page.mouse.click(8, 8);
  await dialog.waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Create branch' }).click();
  await dialog.waitFor();
  await page.setViewportSize({ width: 390, height: 640 });
  const mobileBox = await panel.boundingBox();
  check(mobileBox && mobileBox.x >= 0 && mobileBox.x + mobileBox.width <= 390, 'Dialog exceeds mobile viewport');
  await story('ui-dialog--long-body');
  await page.getByRole('dialog').waitFor();
  const longPanel = page.getByRole('dialog').locator('header').locator('..');
  const scrollMetrics = await longPanel.evaluate(node => {
    const header = node.querySelector('header');
    const footer = node.querySelector('footer');
    const body = header?.nextElementSibling;
    return { panelHeight: node.getBoundingClientRect().height, bodyClient: body?.clientHeight, bodyScroll: body?.scrollHeight, footerBottom: footer?.getBoundingClientRect().bottom };
  });
  check(scrollMetrics.panelHeight <= 608 && scrollMetrics.bodyScroll > scrollMetrics.bodyClient && scrollMetrics.footerBottom <= 640, 'Long dialog body must scroll with footer visible');
  await page.screenshot({ path: '.scratch/create-branch/design/dialog-browser-mobile-long.png' });
  await story('ui-dialog--prevent-close');
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  check(await page.getByRole('dialog').isVisible(), 'Prevent-close dialog dismissed on Escape');
  await page.mouse.click(8, 8);
  check(await page.getByRole('dialog').isVisible(), 'Prevent-close dialog dismissed on backdrop');
  await page.setViewportSize({ width: 1440, height: 900 });
  await story('forms-formrow--stacked-with-helper-and-counter');
  const input = page.getByRole('textbox');
  await input.waitFor();
  const layout = await input.evaluate(node => {
    const label = document.querySelector(`label[for="${node.id}"]`);
    return { inputTop: node.getBoundingClientRect().top, labelBottom: label?.getBoundingClientRect().bottom, describedBy: node.getAttribute('aria-describedby') };
  });
  check(layout.labelBottom <= layout.inputTop && layout.describedBy, 'Stacked FormRow layout/helper wiring failed');
  const buttonWidths = {};
  for (const variant of ['primary', 'secondary']) {
    await story(`ui-button--${variant}`);
    await page.getByRole('button', { name: 'Button', exact: true }).waitFor();
    const idleWidth = (await page.getByRole('button', { name: 'Button', exact: true }).boundingBox()).width;
    await story(`ui-button--${variant}-loading`);
    const busyButton = page.getByRole('button', { name: 'Button', exact: true });
    await busyButton.waitFor();
    const busyWidth = (await busyButton.boundingBox()).width;
    check(idleWidth === busyWidth && await busyButton.isDisabled() && await busyButton.getAttribute('aria-busy') === 'true', `${variant} busy state shifted width or is enabled`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const animation = await busyButton.locator('span.border-2').evaluate(node => getComputedStyle(node).animationName);
    check(animation === 'none', 'Spinner animates despite reduced motion');
    buttonWidths[variant] = { idleWidth, busyWidth, reducedMotionAnimation: animation };
  }
  console.log(JSON.stringify({buttonWidths}));
  check(errors.length === 0, `Browser console errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({ dialog: box, mobileDialog: mobileBox, scrollMetrics, formRow: layout, dimensions, pageErrors: errors }, null, 2));
} finally {
  await browser.close();
}
