import { test, expect } from "@playwright/test";

test("home opens Horaion login and navigates to registration", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page).toHaveURL(/\/login$/);
	await expect(page).toHaveTitle(/Horaion/);
	await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
	await page.getByRole("link", { name: "Sign up" }).click();
	await expect(page).toHaveURL(/\/register$/);
	await expect(page.getByLabel("Company name", { exact: true })).toBeVisible();
	await page
		.getByRole("link", {
			name: "Log in",
			exact: true,
		})
		.click();
	await expect(page).toHaveURL(/\/login$/);
});

test("registration submits the onboarding contract and requires email verification", async ({
	page,
}) => {
	await page.route("**/api/v1/public/onboardings", async (route) => {
		expect(route.request().postDataJSON()).toEqual({
			displayName: "Alex Tan",
			companyName: "Acme",
			registrationNumber: "202600001A",
			subdomain: "acme",
			email: "alex@example.com",
			password: "Example123!",
		});
		await route.fulfill({
			status: 201,
			contentType: "application/json",
			body: JSON.stringify({ data: { companyId: "test-company" } }),
		});
	});
	await page.goto("/register");
	await page.getByLabel("First name").fill("Alex");
	await page.getByLabel("Last name").fill("Tan");
	await page.getByLabel("Company name", { exact: true }).fill("Acme");
	await page
		.getByLabel("Registration number", { exact: true })
		.fill("202600001A");
	await page.getByLabel("Workspace name").fill("acme");
	await page.getByLabel("Email address").fill("alex@example.com");
	await page.getByLabel("Password", { exact: true }).fill("Example123!");
	await page
		.getByLabel("Confirm password", { exact: true })
		.fill("Example123!");
	await page.getByRole("button", { name: "Sign up", exact: true }).click();
	await expect(page.getByRole("status")).toContainText("verify your email");
	await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
});

test("registration reports a service error without pretending to create an account", async ({
	page,
}) => {
	await page.route("**/api/v1/public/onboardings", (route) =>
		route.fulfill({ status: 409 })
	);
	await page.goto("/register");
	await page.getByLabel("First name").fill("Alex");
	await page.getByLabel("Last name").fill("Tan");
	await page.getByLabel("Company name", { exact: true }).fill("Acme");
	await page
		.getByLabel("Registration number", { exact: true })
		.fill("202600001A");
	await page.getByLabel("Workspace name").fill("acme");
	await page.getByLabel("Email address").fill("alex@example.com");
	await page.getByLabel("Password", { exact: true }).fill("Example123!");
	await page
		.getByLabel("Confirm password", { exact: true })
		.fill("Example123!");
	await page.getByRole("button", { name: "Sign up", exact: true }).click();
	await expect(page.getByRole("alert")).toContainText("already in use");
});

test("login is honest about the unavailable session service", async ({
	page,
}) => {
	await page.goto("/login");
	await page.getByLabel("Email", { exact: true }).fill("alex@example.com");
	await page.getByLabel("Password", { exact: true }).fill("Example123!");
	await page.getByRole("button", { name: "Show password" }).click();
	await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
		"type",
		"text"
	);
	await page.getByRole("button", { name: "Log in", exact: true }).click();
	await expect(page.getByRole("alert")).toContainText(
		"Sign-in is not available yet"
	);
	await expect(page).toHaveURL(/\/login$/);
});

test("registration rejects invalid details before sending a request", async ({
	page,
}) => {
	let requests = 0;
	await page.route("**/api/v1/public/onboardings", async (route) => {
		requests += 1;
		await route.fulfill({ status: 500 });
	});
	await page.goto("/register");
	await page.getByLabel("First name").fill("   ");
	await page.getByLabel("Company name", { exact: true }).fill("Acme");
	await page
		.getByLabel("Registration number", { exact: true })
		.fill("202600001A");
	await page.getByLabel("Workspace name").fill("-invalid");
	await page.getByLabel("Email address").fill("invalid-email");
	await page.getByLabel("Password", { exact: true }).fill("short");
	await page.getByRole("button", { name: "Sign up", exact: true }).click();
	await expect(page.getByLabel("First name")).toHaveAttribute(
		"aria-invalid",
		"true"
	);
	await expect(page.getByLabel("First name")).toBeFocused();
	await expect(page.getByText("First name is required.")).toBeVisible();
	await expect(page.getByText("Last name is required.")).toBeVisible();
	await expect(
		page.getByText("Enter a valid email address, such as name@company.com.")
	).toBeVisible();
	await expect(
		page.getByText("Use between 8 and 128 characters.")
	).toBeVisible();
	await page.getByLabel("Workspace name").fill("admin");
	await expect(
		page.getByText("This workspace name is reserved. Choose another one.")
	).toBeVisible();
	await page.getByLabel("Workspace name").fill("my-company");
	await expect(page.getByLabel("Workspace name")).not.toHaveAttribute(
		"aria-invalid",
		"true"
	);

	expect(requests).toBe(0);
});

test("registration fits a narrow mobile screen", async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto("/register");
	await expect(page.getByRole("heading", { name: "Sign up" })).toBeVisible();
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth
		)
	).toBe(true);
	await expect(
		page.getByRole("button", { name: "Sign up", exact: true })
	).toBeVisible();
});

test("registration blocks mismatched passwords and allows correction", async ({
	page,
}) => {
	let requests = 0;
	await page.route("**/api/v1/public/onboardings", async (route) => {
		requests += 1;
		expect(route.request().postDataJSON()).not.toHaveProperty(
			"confirmPassword"
		);
		await route.fulfill({
			status: 201,
			contentType: "application/json",
			body: JSON.stringify({ data: { companyId: "test-company" } }),
		});
	});
	await page.goto("/register");
	await page.getByLabel("First name").fill("Alex");
	await page.getByLabel("Last name").fill("Tan");
	await page.getByLabel("Company name", { exact: true }).fill("Acme");
	await page
		.getByLabel("Registration number", { exact: true })
		.fill("202600001A");
	await page.getByLabel("Workspace name").fill("acme");
	await page.getByLabel("Email address").fill("alex@example.com");
	await page.getByLabel("Password", { exact: true }).fill("Example123!");
	const confirmation = page.getByLabel("Confirm password", { exact: true });
	await page.getByRole("button", { name: "Sign up", exact: true }).click();
	expect(
		await confirmation.evaluate(
			(input: HTMLInputElement) => input.validity.valueMissing
		)
	).toBe(true);
	expect(requests).toBe(0);
	await confirmation.fill("Different123!");
	await page.getByRole("button", { name: "Sign up", exact: true }).click();
	await expect(confirmation).toHaveAttribute("aria-invalid", "true");
	await expect(confirmation).toBeFocused();
	await expect(
		page.getByText(
			"Passwords don’t match. Enter the same password in both fields."
		)
	).toBeVisible();
	expect(requests).toBe(0);
	await confirmation.fill("Example123!");
	await page
		.getByRole("button", { name: "Show confirmed password", exact: true })
		.click();
	await expect(confirmation).toHaveAttribute("type", "text");
	await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
		"type",
		"password"
	);
	await page.getByRole("button", { name: "Sign up", exact: true }).click();
	await expect(page.getByRole("status")).toContainText("verify your email");
	expect(requests).toBe(1);
});
