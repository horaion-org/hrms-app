import {
	test,
	expect,
	type BrowserContext,
	type Route,
} from "@playwright/test";
import {
	E2E_ACCESS_PASS,
	E2E_EMAIL,
	E2E_PASSWORD,
	mockSessionRoutes,
	webStorage,
} from "./session";

// Onboarding and email confirmation are answered at the network layer, like
// the Session routes in ./session. The emailed code is always CODE.

const CODE = "123456";

type SignUpApi = {
	/** Bodies the confirmation routes received, as `"<path> <json>"`. */
	calls: Array<string>;
};

const json = (route: Route, status: number, body?: unknown): Promise<void> =>
	route.fulfill({
		status,
		contentType: "application/json",
		body: body === undefined ? "" : JSON.stringify(body),
	});

const mockSignUpRoutes = async (
	context: BrowserContext
): Promise<SignUpApi> => {
	const api: SignUpApi = { calls: [] };

	await context.route("**/api/v1/public/onboardings", (route) =>
		json(route, 201, {
			success: true,
			/* eslint-disable-next-line camelcase -- the API's JSON is snake_case */
			data: { company_id: "e2e-company" },
			message: "Created",
			timestamp: new Date().toISOString(),
			path: "/api/v1/public/onboardings",
		})
	);
	await context.route("**/api/v1/public/sign-up-confirmation*", (route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		api.calls.push(`${path} ${request.postData() ?? ""}`);

		if (path.endsWith("/sign-up-confirmation-codes")) {
			return json(route, 202);
		}

		const { code } = request.postDataJSON() as { code: string };

		return code === CODE
			? json(route, 204)
			: json(route, 400, {
					status: 400,
					title: "Refused",
					detail: "INVALID_CODE",
					errorCode: "INVALID_CODE",
				});
	});

	return api;
};

test("a founder signs up, confirms their email and signs in", async ({
	context,
	page,
}) => {
	await mockSessionRoutes(context);
	const api = await mockSignUpRoutes(context);

	await page.goto("/sign-up");
	await page.getByLabel("Company name").fill("Acme");
	await page.getByLabel("Workspace address").fill("acme");
	await page.getByLabel("Your name").fill("Jose Rizal");
	await page.getByLabel("Email address").fill(E2E_EMAIL);
	await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
	await page.getByRole("button", { name: "Create company" }).click();

	await expect(page).toHaveURL(/\/confirm-email\?email=/);
	await expect(
		page.getByText(`We emailed a confirmation code to ${E2E_EMAIL}.`)
	).toBeVisible();

	await page.getByLabel("Confirmation code").fill("000000");
	await page.getByRole("button", { name: "Confirm" }).click();
	await expect(
		page.getByText("That code is not right. Check it and try again.")
	).toBeVisible();

	await page.getByRole("button", { name: "Send another code" }).click();
	await expect(page.getByText("We sent another code.")).toBeVisible();

	await page.getByLabel("Confirmation code").fill(CODE);
	await page.getByRole("button", { name: "Confirm" }).click();

	await expect(page).toHaveURL(/\/sign-in\?email=/);
	await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
		E2E_EMAIL
	);
	await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
	await page.getByRole("button", { name: "Log in" }).click();

	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByText("Hello, world!")).toBeVisible();
	expect(await webStorage(page)).not.toContain(E2E_ACCESS_PASS);
	expect(api.calls).toEqual([
		`/api/v1/public/sign-up-confirmations ${JSON.stringify({ email: E2E_EMAIL, code: "000000" })}`,
		`/api/v1/public/sign-up-confirmation-codes ${JSON.stringify({ email: E2E_EMAIL })}`,
		`/api/v1/public/sign-up-confirmations ${JSON.stringify({ email: E2E_EMAIL, code: CODE })}`,
	]);
});

test("an unconfirmed person who signs in is sent to confirm their email", async ({
	context,
	page,
}) => {
	await mockSessionRoutes(context);
	await context.route("**/api/v1/public/sessions", (route) =>
		json(route, 403, {
			status: 403,
			title: "Refused",
			detail: "EMAIL_NOT_VERIFIED",
			errorCode: "EMAIL_NOT_VERIFIED",
		})
	);

	await page.goto("/sign-in");
	await page.getByLabel("Email", { exact: true }).fill(E2E_EMAIL);
	await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
	await page.getByRole("button", { name: "Log in" }).click();

	await expect(page).toHaveURL(/\/confirm-email\?email=/);
	await expect(
		page.getByText(`We emailed a confirmation code to ${E2E_EMAIL}.`)
	).toBeVisible();
});
