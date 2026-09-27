import type { Page } from "@playwright/test";

/*
 * The e2e dev server runs against a fake pool (see playwright.config.ts), so a
 * test can sign in by seeding the tokens amazon-cognito-identity-js reads from
 * localStorage. The guard only checks that a session is present and unexpired;
 * the API, not the app, verifies signatures.
 */
export const E2E_COGNITO_USER_POOL_ID = "ap-southeast-1_e2eTestPool";
export const E2E_COGNITO_CLIENT_ID = "e2e-test-client";

const base64Url = (value: object): string =>
	Buffer.from(JSON.stringify(value)).toString("base64url");

const unsignedJwt = (claims: object): string =>
	`${base64Url({ alg: "none", typ: "JWT" })}.${base64Url(claims)}.signature`;

export const seedSignedInSession = async (
	page: Page,
	email = "owner@acme.test"
): Promise<void> => {
	const now = Math.floor(Date.now() / 1000);
	const claims = { sub: "e2e-user", iat: now, exp: now + 3600 };
	const prefix = `CognitoIdentityServiceProvider.${E2E_COGNITO_CLIENT_ID}`;
	const entries: Record<string, string> = {
		[`${prefix}.LastAuthUser`]: email,
		[`${prefix}.${email}.idToken`]: unsignedJwt({
			...claims,
			email,
			token_use: "id",
		}),
		[`${prefix}.${email}.accessToken`]: unsignedJwt({
			...claims,
			token_use: "access",
		}),
		[`${prefix}.${email}.refreshToken`]: "e2e-refresh-token",
		[`${prefix}.${email}.clockDrift`]: "0",
	};

	await page.addInitScript((seed: Record<string, string>) => {
		for (const [key, value] of Object.entries(seed)) {
			window.localStorage.setItem(key, value);
		}
	}, entries);
};
