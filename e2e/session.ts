import {
	expect,
	type BrowserContext,
	type Page,
	type Route,
} from "@playwright/test";
import { z } from "zod";

export const E2E_EMAIL = "owner@acme.test";
export const E2E_PASSWORD = "Example123!";
export const E2E_ACCESS_PASS = "e2e-access-pass";
const SESSIONS = "/api/v1/public/sessions";
const credentialsSchema = z.object({ email: z.string(), password: z.string() });
type MockApi = { session: "empty" | "active"; calls: Array<string> };
const json = (route: Route, status: number, body?: unknown): Promise<void> =>
	route.fulfill({
		status,
		contentType: "application/json",
		body: body === undefined ? "" : JSON.stringify(body),
	});
const envelope = (data: unknown): unknown => ({
	success: true,
	message: "OK",
	data,
	path: SESSIONS,
	timestamp: new Date().toISOString(),
});
const accessPass = (route: Route): Promise<void> =>
	json(route, 200, envelope({ accessToken: E2E_ACCESS_PASS, expiresIn: 900 }));
const problem = (route: Route, errorCode: string): Promise<void> =>
	json(route, 401, { status: 401, errorCode });

/** Models a shared cookie across pages; each page still holds its own memory pass. */
export const mockSessionRoutes = async (
	context: BrowserContext
): Promise<MockApi> => {
	const api: MockApi = { session: "empty", calls: [] };
	await context.route(`**${SESSIONS}**`, async (route) => {
		const request = route.request();
		const call = `${request.method()} ${new URL(request.url()).pathname}`;
		api.calls.push(call);
		expect(request.headers()["content-type"]).toContain("application/json");
		switch (call) {
			case `POST ${SESSIONS}`: {
				const body: unknown = request.postDataJSON();
				const { email, password } = credentialsSchema.parse(body);
				if (email !== E2E_EMAIL || password !== E2E_PASSWORD)
					return problem(route, "INVALID_CREDENTIALS");
				api.session = "active";
				return accessPass(route);
			}
			case `POST ${SESSIONS}/refreshes`:
				expect(request.postDataJSON()).toEqual({});
				return api.session === "active"
					? accessPass(route)
					: problem(route, "SESSION_EXPIRED");
			case `DELETE ${SESSIONS}`:
				expect(request.postDataJSON()).toEqual({});
				api.session = "empty";
				return json(route, 204);
			default:
				return route.fallback();
		}
	});
	await context.route("**/api/v1/me", (route) => {
		expect(route.request().headers()["authorization"]).toBe(
			`Bearer ${E2E_ACCESS_PASS}`
		);
		return api.session === "active"
			? json(
					route,
					200,
					envelope({
						userId: "e2e-user",
						email: E2E_EMAIL,
						displayName: "Owner",
						status: "ACTIVE",
						memberships: [
							{
								membershipId: "m-acme",
								companyId: "acme",
								companyName: "Acme",
								subdomain: "acme",
								companyStatus: "ACTIVE",
								status: "ACTIVE",
							},
						],
					})
				)
			: problem(route, "SESSION_EXPIRED");
	});
	return api;
};
export const logIn = async (
	page: Page,
	password = E2E_PASSWORD
): Promise<void> => {
	await page.getByLabel("Email", { exact: true }).fill(E2E_EMAIL);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Log in", exact: true }).click();
};
/** All keys as well as values are checked. */
export const webStorage = (page: Page): Promise<string> =>
	page.evaluate(() =>
		JSON.stringify({ ...window.localStorage, ...window.sessionStorage })
	);
