import { expect, test } from "@playwright/test";
import { mockSessionRoutes } from "./session";

test.beforeEach(async ({ context }) => {
	const session = await mockSessionRoutes(context);
	session.session = "active";
});

test("leave requests, timeline, and rejection states", async ({
	page,
}, testInfo) => {
	await page.setViewportSize({ width: 1440, height: 1236 });
	await page.goto("/leave");
	await expect(
		page.getByRole("heading", { name: "Leave overview" })
	).toBeVisible();
	await expect(page.getByText("1–10 of 24 entries")).toBeVisible();
	await page.screenshot({
		path: testInfo.outputPath("requests.png"),
		fullPage: true,
	});
	await page.getByRole("button", { name: "Next page" }).click();
	await expect(page.getByText("11–20 of 24 entries")).toBeVisible();
	await page.getByRole("tab", { name: "Timeline" }).click();
	const cheryl = page.getByRole("button", { name: /^Cheryl Ng ·/ });
	await cheryl.hover();
	await expect(page.getByRole("tooltip")).toBeVisible();
	await page.screenshot({
		path: testInfo.outputPath("timeline.png"),
		fullPage: true,
	});
	await cheryl.click();
	const dialog = page.getByRole("dialog", { name: "Leave request" });
	await expect(dialog).toBeVisible();
	await page.screenshot({
		path: testInfo.outputPath("request-dialog.png"),
		fullPage: true,
	});
	await dialog.getByRole("button", { name: "Reject", exact: true }).click();
	await page.screenshot({
		path: testInfo.outputPath("rejection.png"),
		fullPage: true,
	});
	await dialog
		.getByRole("textbox", { name: "Reason for rejection" })
		.fill("Coverage needed for the team event.");
	await dialog.getByRole("button", { name: "Confirm rejection" }).click();
	await expect(dialog).not.toBeVisible();
	await expect(cheryl).toHaveCount(0);
	await page.getByRole("tab", { name: "Requests" }).click();
	await page
		.getByRole("button", { name: "View request for Cheryl Ng" })
		.click();
	await expect(
		dialog.getByText("Coverage needed for the team event.")
	).toBeVisible();
});

test("narrow-screen layout and applying a sample request", async ({
	page,
}, testInfo) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto("/leave");
	await expect(
		page.getByRole("heading", { name: "Leave overview" })
	).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
		375
	);
	await page.getByRole("button", { name: "Apply leave" }).click();
	const dialog = page.getByRole("dialog", { name: "Apply leave" });
	await dialog.getByRole("button", { name: /^Leave dates:/ }).click();
	await page.getByRole("gridcell", { name: "Tuesday, 16 June 2026" }).click();
	await page.getByRole("gridcell", { name: "Thursday, 18 June 2026" }).click();
	await dialog.getByRole("button", { name: "Submit request" }).click();
	await expect(dialog).not.toBeVisible();
	await expect(page.getByText("1–10 of 25 entries")).toBeVisible();
	await page.getByRole("tab", { name: "Timeline" }).click();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
		375
	);
	await page.screenshot({
		path: testInfo.outputPath("mobile-timeline.png"),
		fullPage: true,
	});
	await page.getByRole("button", { name: /^Cheryl Ng ·/ }).click();
	await page.getByRole("button", { name: "Reject", exact: true }).click();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
		375
	);
	await page.screenshot({
		path: testInfo.outputPath("mobile-rejection.png"),
		fullPage: true,
	});
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).not.toBeVisible();
});
