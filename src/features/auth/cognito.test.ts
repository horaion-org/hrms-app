import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as cognitoModule from "@/features/auth/cognito";

const poolConfigs = vi.hoisted((): Array<Record<string, unknown>> => []);
const storedUserKey = vi.hoisted(
	(): string => "CognitoIdentityServiceProvider.test-client.LastAuthUser"
);

vi.mock("amazon-cognito-identity-js", () => ({
	AuthenticationDetails: vi.fn(),
	CognitoUser: class {
		public authenticateUser(
			authenticationDetails: unknown,
			handlers: { onSuccess: () => void }
		): void {
			void authenticationDetails;
			handlers.onSuccess();
		}
	},
	CognitoUserPool: class {
		private readonly storage: Storage;

		public constructor(config: Record<string, unknown>) {
			poolConfigs.push(config);
			const storage = config["Storage"];

			if (!(storage instanceof Storage)) {
				throw new TypeError("Cognito storage is required.");
			}

			this.storage = storage;
		}
		public getCurrentUser(): { getUsername: () => string } | null {
			const username = this.storage.getItem(storedUserKey);

			return username === null ? null : { getUsername: () => username };
		}
	},
}));

async function loadAuth(): Promise<typeof cognitoModule> {
	return import("@/features/auth/cognito");
}

beforeEach(() => {
	vi.resetModules();
	vi.stubEnv("VITE_COGNITO_CLIENT_ID", "test-client");
	window.localStorage.clear();
	window.sessionStorage.clear();
	poolConfigs.length = 0;
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("cognito session storage", () => {
	it("given_noRememberChoice_when_signingIn_then_thePoolPersistsSessions", async () => {
		const { signIn } = await loadAuth();

		await signIn("member@example.com", "password");

		expect(poolConfigs[0]?.["Storage"]).toBe(window.localStorage);
	});

	it("given_rememberMeDeclined_when_signingIn_then_theSessionIsScopedToTheTab", async () => {
		const { signIn } = await loadAuth();

		await signIn("member@example.com", "password", false);

		expect(poolConfigs[0]?.["Storage"]).toBe(window.sessionStorage);
	});

	it("given_rememberMeDeclined_when_theTabReloads_then_theChoiceIsKept", async () => {
		const { signIn } = await loadAuth();
		await signIn("member@example.com", "password", false);
		window.sessionStorage.setItem(storedUserKey, "tab-user");

		vi.resetModules();
		const reloaded = await loadAuth();

		expect(reloaded.currentUser()?.getUsername()).toBe("tab-user");
		expect(poolConfigs[0]?.["Storage"]).toBe(window.sessionStorage);
	});

	it("given_rememberMeDeclined_when_anIndependentTabOpens_then_noSessionIsFound", async () => {
		const { currentUser, signIn } = await loadAuth();
		await signIn("member@example.com", "password", false);
		window.sessionStorage.setItem(storedUserKey, "tab-user");
		currentUser();

		// An independently opened tab starts with empty sessionStorage.
		window.sessionStorage.clear();
		vi.resetModules();
		const reloaded = await loadAuth();

		expect(reloaded.currentUser()).toBeNull();
		expect(poolConfigs[1]?.["Storage"]).toBe(window.localStorage);
	});

	it("given_rememberMeDeclined_when_reEnabled_then_thePoolPersistsAgain", async () => {
		const { signIn } = await loadAuth();

		await signIn("member@example.com", "password", false);
		await signIn("member@example.com", "password", true);

		expect(poolConfigs[poolConfigs.length - 1]?.["Storage"]).toBe(
			window.localStorage
		);
	});

	it("given_aRememberedSession_when_rememberMeIsDeclined_then_itCannotReturnAfterRestart", async () => {
		window.localStorage.setItem(storedUserKey, "remembered-user");
		const { signIn } = await loadAuth();

		await signIn("member@example.com", "password", false);
		window.sessionStorage.clear();
		vi.resetModules();
		const reloaded = await loadAuth();

		expect(reloaded.currentUser()).toBeNull();
		expect(window.localStorage.getItem(storedUserKey)).toBeNull();
	});
});
