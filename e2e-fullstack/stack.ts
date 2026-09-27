import {
	expect,
	type APIRequestContext,
	type Page,
	type Response,
} from "@playwright/test";

/*
 * Where the stack started by run.sh listens, and what the suite may rely on
 * from it. Nothing here answers a route: every request goes to the real API.
 */

const portFromEnvironment = (name: string, fallback: number): number => {
	const value = process.env[name];

	return value === undefined || value === "" ? fallback : Number(value);
};

const API_PORT = portFromEnvironment("E2E_API_PORT", 18080);

/** The Vite dev server the browser loads the app from. */
export const APP_ORIGIN = `http://localhost:${portFromEnvironment("E2E_APP_PORT", 15173)}`;

/**
 * The API as the app calls it: the same site as the app (localhost), which is
 * what lets the SameSite=Strict Session cookie travel with its requests.
 */
export const API_ORIGIN = `http://localhost:${API_PORT}`;

/** The API for the suite's own calls; it listens on IPv4 loopback only. */
const API_LOOPBACK = `http://127.0.0.1:${API_PORT}`;

export const SESSION_COOKIE = "__Secure-horaion_rt";
export const SESSION_PATH = "/api/v1/public/sessions";
export const CURRENT_COMPANY_KEY = "horaion.currentCompanyId";

/**
 * The one code every authenticator of the fake identity store produces
 * (InMemoryIdentityProvider.VALID_TOTP_CODE in the API's tests).
 */
export const VALID_TOTP_CODE = "123456";

/** Passes the app's and the fake pool's password policy. */
const PASSWORD = "Str0ng!e2e-pass";

export type Founder = {
	email: string;
	password: string;
	companyName: string;
	subdomain: string;
	displayName: string;
};

/**
 * A founder no earlier run has used: the database lives for one run, but the
 * suite may also be pointed at a stack that stays up between runs.
 */
export const newFounder = (): Founder => {
	const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

	return {
		email: `founder-${id}@e2e.horaion.test`,
		password: PASSWORD,
		companyName: `E2E Company ${id}`,
		subdomain: `e2e-${id}`,
		displayName: "E2E Founder",
	};
};

/**
 * The confirmation code the fake identity store "emailed" to `email`, read
 * through the helper route only the API's e2e launcher serves.
 */
export const emailedConfirmationCode = async (
	request: APIRequestContext,
	email: string
): Promise<string> => {
	const response = await request.post(
		`${API_LOOPBACK}/internal/e2e/confirmation-code-lookups`,
		{ data: { email } }
	);
	expect(response.status(), "an emailed confirmation code").toBe(200);
	const { code } = (await response.json()) as { code: string };

	return code;
};

/**
 * Signs a founder up and confirms their email through the public API, as the
 * app would, for tests that start from a founder who can already sign in.
 */
export const signUpConfirmedFounder = async (
	request: APIRequestContext
): Promise<Founder> => {
	const founder = newFounder();
	const headers = { Origin: APP_ORIGIN };
	const onboarding = await request.post(
		`${API_LOOPBACK}/api/v1/public/onboardings`,
		{
			headers,
			/* eslint-disable camelcase -- the API's JSON is snake_case */
			data: {
				email: founder.email,
				password: founder.password,
				company_name: founder.companyName,
				subdomain: founder.subdomain,
				display_name: founder.displayName,
			},
			/* eslint-enable camelcase */
		}
	);
	expect(onboarding.status(), "onboarding").toBe(201);

	const code = await emailedConfirmationCode(request, founder.email);
	const confirmation = await request.post(
		`${API_LOOPBACK}/api/v1/public/sign-up-confirmations`,
		{ headers, data: { email: founder.email, code } }
	);
	expect(confirmation.status(), "email confirmation").toBe(204);

	return founder;
};

/** The next response to `method path` on the API, to await after an action. */
export const apiResponse = (
	page: Page,
	method: string,
	path: string
): Promise<Response> =>
	page.waitForResponse(
		(response) =>
			response.request().method() === method &&
			response.url().startsWith(API_ORIGIN) &&
			new URL(response.url()).pathname === path
	);

/** The access token in a sign-in or renewal response. */
export const accessTokenIn = async (response: Response): Promise<string> => {
	const body = (await response.json()) as {
		/* eslint-disable-next-line camelcase -- the API's JSON is snake_case */
		data: { access_token: string };
	};

	return body.data.access_token;
};

export type WebStorage = {
	local: Record<string, string>;
	session: Record<string, string>;
};

/** Every key and value in the page's localStorage and sessionStorage. */
export const webStorage = (page: Page): Promise<WebStorage> =>
	page.evaluate(() => ({
		local: { ...window.localStorage },
		session: { ...window.sessionStorage },
	}));

/** A JWT anywhere in a string: three base64url parts, the first a JSON header. */
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/;

/**
 * i18next's language detector remembers the detected language here. It is a
 * display preference, not a credential, and the Session code never writes it.
 */
const LANGUAGE_PREFERENCE_KEY = "i18nextLng";

/** The only keys the app may keep in web storage. */
const ALLOWED_STORAGE_KEYS: ReadonlySet<string> = new Set([
	CURRENT_COMPANY_KEY,
	LANGUAGE_PREFERENCE_KEY,
]);

/**
 * Web storage holds no credential: none of `secrets` (tokens the test saw on
 * the wire), nothing shaped like a JWT, nothing in sessionStorage, and no key
 * in localStorage but the Current Company's id (besides the language
 * preference above, whose value is scanned all the same).
 */
export const expectNoCredentialInWebStorage = async (
	page: Page,
	secrets: Array<string>
): Promise<void> => {
	const storage = await webStorage(page);
	const everything = JSON.stringify(storage);

	for (const secret of secrets) {
		expect(everything, "a token in web storage").not.toContain(secret);
	}

	expect(everything, "a JWT in web storage").not.toMatch(JWT);
	expect(Object.keys(storage.session), "sessionStorage keys").toEqual([]);
	expect(
		Object.keys(storage.local).filter((key) => !ALLOWED_STORAGE_KEYS.has(key)),
		"unexpected localStorage keys"
	).toEqual([]);
};
