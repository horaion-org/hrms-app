import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mockDemoCompany } from "./demoCompany";
import { mockSessionRoutes } from "./session";

/** The narrowest phone the app supports, and a tablet in portrait, where the rail gives way to the Menu bar. */
const SCREENS = [
	{ name: "a phone", viewport: { width: 360, height: 740 } },
	{ name: "a tablet", viewport: { width: 768, height: 1024 } },
];

/** Every signed-in page, with the ids `mockDemoCompany` answers for, and the team views and day view a phone shows. */
const SIGNED_IN_ROUTES = [
	"/",
	"/scheduling",
	"/scheduling/new",
	"/scheduling/s-1",
	"/scheduling/s-1?day=2026-10-14",
	"/me/schedules/s-1",
	"/leave",
	"/leave?view=requests",
	"/leave?view=timeline",
	"/availability",
	"/notifications",
	"/people",
	"/people/m-2",
	"/people/new",
	"/organisation",
	"/organisation/branches",
	"/organisation/departments",
	"/organisation/job-titles",
	"/organisation/skills",
	"/settings/access-roles",
	"/settings/access-roles/new",
	"/settings/access-roles/r-2",
	"/settings/access-roles/r-2?tab=permissions",
	"/activity",
	"/settings",
	"/settings/data/import-organisation",
	"/settings/data/import-people",
	"/me/profile",
	"/me/password",
	"/forbidden",
];

const SIGNED_OUT_ROUTES = [
	"/login",
	"/register",
	"/forgot-password",
	"/confirm-email",
];

/** How far the page itself scrolls sideways; content in its own scroll frame does not count. */
const sidewaysScroll = (page: Page): Promise<number> =>
	page.evaluate(
		() =>
			document.documentElement.scrollWidth -
			document.documentElement.clientWidth
	);

/** Each route with the API it needs: a populated company when signed in, only the Session routes when not. */
const ROUTES: Array<{
	path: string;
	mockApi: (context: BrowserContext) => Promise<unknown>;
}> = [
	...SIGNED_IN_ROUTES.map((path) => ({ path, mockApi: mockDemoCompany })),
	...SIGNED_OUT_ROUTES.map((path) => ({ path, mockApi: mockSessionRoutes })),
];

for (const screen of SCREENS) {
	test.describe(`on ${screen.name}`, () => {
		test.use({ viewport: screen.viewport, hasTouch: true });

		for (const { path, mockApi } of ROUTES) {
			test(`${path} does not scroll sideways`, async ({ context, page }) => {
				await mockApi(context);
				await page.goto(path);
				await expect(page.getByRole("main")).toBeVisible();
				await page.waitForLoadState("networkidle");

				expect(await sidewaysScroll(page)).toBe(0);
			});
		}
	});
}

/**
 * Pages whose first row of content a phone must show without scrolling: the
 * roster, a list, a Settings section and the leave timeline. The timeline's
 * demo leave is in May 2026, so its clock is set to a day in that window.
 */
const FIRST_SCREEN_ROWS: Array<{ path: string; clock?: string }> = [
	{ path: "/scheduling/s-1" },
	{ path: "/people" },
	{ path: "/settings?section=leave" },
	{ path: "/leave?view=timeline", clock: "2026-05-20T10:00:00" },
];

test.describe("on a phone, the first screen", () => {
	test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

	for (const { path, clock } of FIRST_SCREEN_ROWS) {
		test(`${path} starts its first row above the fold`, async ({
			context,
			page,
		}) => {
			await mockDemoCompany(context);
			if (clock) await page.clock.setFixedTime(new Date(clock));
			await page.goto(path);
			const firstRow = page.getByRole("main").locator("tbody tr").first();
			await expect(firstRow).toBeVisible();

			expect((await firstRow.boundingBox())?.y).toBeLessThan(740);
		});
	}
});
