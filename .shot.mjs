import { chromium } from "@playwright/test";
const out = process.argv[2];
const browser = await chromium.launch();
for (const [id, name] of [
	["features-organisation-accessroleassignments--default", "assigned"],
	["features-organisation-accessroleassignments--empty", "assigned-empty"],
	["features-organisation-assignaccessroledialog--default", "assign-dialog"],
]) {
	const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
	await page.goto(`http://localhost:6111/iframe.html?id=${id}&viewMode=story`);
	await page.waitForTimeout(6000);
	await page.screenshot({ path: `${out}/${name}.png` });
	await page.close();
}
await browser.close();
