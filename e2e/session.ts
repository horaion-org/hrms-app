import type { BrowserContext, Page, Route } from "@playwright/test";

/*
 * The e2e dev server points the app at its own origin (see
 * playwright.config.ts), and these helpers answer the API's Session routes at
 * the network layer. The Session cookie is modelled as a flag shared by every
 * page of the browser context, the way a real cookie is shared by its tabs.
 */

export const E2E_EMAIL = "owner@acme.test";
export const E2E_PASSWORD = "Str0ng!pass";
export const E2E_ACCESS_PASS = "e2e-access-pass";

const SESSIONS = "/api/v1/public/sessions";

export type MockApi = {
	/** Whether the browser holds a live Session cookie. */
	signedIn: boolean;
	/** Every Session route called, as `"<METHOD> <path>"`. */
	calls: Array<string>;
};

const json = (route: Route, status: number, body?: unknown): Promise<void> =>
	route.fulfill({
		status,
		contentType: "application/json",
		body: body === undefined ? "" : JSON.stringify(body),
	});

const accessPass = (route: Route): Promise<void> =>
	json(route, 200, {
		success: true,
		/* eslint-disable-next-line camelcase -- the API's JSON is snake_case */
		data: { access_token: E2E_ACCESS_PASS, expires_in: 900 },
		message: "OK",
		timestamp: new Date().toISOString(),
		path: SESSIONS,
	});

const problem = (
	route: Route,
	status: number,
	errorCode: string
): Promise<void> =>
	json(route, status, {
		status,
		title: "Refused",
		detail: errorCode,
		errorCode,
	});

/**
 * Answers the Session routes, and the current user with one active Company,
 * for every page of `context`.
 */
export const mockSessionRoutes = async (
	context: BrowserContext,
	{ signedIn = false }: { signedIn?: boolean } = {}
): Promise<MockApi> => {
	const api: MockApi = { signedIn, calls: [] };

	await context.route(`**${SESSIONS}**`, async (route) => {
		const request = route.request();
		const call = `${request.method()} ${new URL(request.url()).pathname}`;
		api.calls.push(call);

		switch (call) {
			case `POST ${SESSIONS}`: {
				const { email, password } = request.postDataJSON() as {
					email: string;
					password: string;
				};

				if (email !== E2E_EMAIL || password !== E2E_PASSWORD) {
					return problem(route, 401, "INVALID_CREDENTIALS");
				}

				api.signedIn = true;

				return accessPass(route);
			}
			case `POST ${SESSIONS}/refreshes`: {
				return api.signedIn
					? accessPass(route)
					: problem(route, 401, "SESSION_EXPIRED");
			}
			case `DELETE ${SESSIONS}`: {
				api.signedIn = false;

				return json(route, 204);
			}
			default: {
				return route.fallback();
			}
		}
	});

	await context.route("**/api/v1/me", (route) =>
		api.signedIn
			? json(route, 200, {
					success: true,
					/* eslint-disable camelcase -- the API's JSON is snake_case */
					data: {
						user_id: "e2e-user",
						email: E2E_EMAIL,
						display_name: "Owner",
						status: "ACTIVE",
						memberships: [
							{
								membership_id: "e2e-membership",
								company_id: "e2e-company",
								company_name: "Acme",
								subdomain: "acme",
								company_status: "ACTIVE",
								status: "ACTIVE",
							},
						],
					},
					/* eslint-enable camelcase */
					message: "OK",
					timestamp: new Date().toISOString(),
					path: "/api/v1/me",
				})
			: problem(route, 401, "UNAUTHENTICATED")
	);

	return api;
};

/** Every key and value in the page's localStorage and sessionStorage. */
export const webStorage = (page: Page): Promise<string> =>
	page.evaluate(() =>
		JSON.stringify({ ...window.localStorage, ...window.sessionStorage })
	);
