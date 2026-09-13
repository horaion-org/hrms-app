import { test, expect } from "@playwright/test";

// The policy is the actual defence against script injection, so a page that
// triggers a violation is a page that would break in production. Chromium
// reports every violation on the console.

test("the sign-in page renders under the security headers without a policy violation", async ({
	page,
}) => {
	const violations: Array<string> = [];
	page.on("console", (message) => {
		if (message.text().includes("Content Security Policy")) {
			violations.push(message.text());
		}
	});

	const response = await page.goto("/sign-in");
	const headers = response?.headers() ?? {};

	expect(headers["content-security-policy"]).toContain("script-src 'self'");
	expect(headers["content-security-policy"]).not.toContain("unsafe-inline");
	expect(headers["x-frame-options"]).toBe("DENY");
	expect(headers["x-content-type-options"]).toBe("nosniff");
	expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");

	await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
	expect(violations).toEqual([]);
});
