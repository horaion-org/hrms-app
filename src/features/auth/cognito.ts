import {
	AuthenticationDetails,
	CognitoUser,
	CognitoUserPool,
	type CognitoUserSession,
} from "amazon-cognito-identity-js";

/**
 * Direct Cognito access. The API is a pure resource server and issues no
 * tokens, so every credential interaction happens here. See
 * docs/adr/0001-in-app-cognito-authentication.md.
 */

export type SignInOutcome =
	| { status: "SIGNED_IN" }
	| { status: "NEW_PASSWORD_REQUIRED" }
	| { status: "UNCONFIRMED" };

/**
 * The challenged user must be the same instance that received the challenge,
 * because it carries the Cognito session that authorises the reply. It is not
 * serialisable, so it lives here rather than in the store.
 */
let challengedUser: CognitoUser | null = null;

let pool: CognitoUserPool | null = null;

const REMEMBER_SESSION_KEY = "horaion.auth.remember-session";

function clearCognitoSession(storage: Storage): void {
	const keyPrefix = `CognitoIdentityServiceProvider.${import.meta.env.VITE_COGNITO_CLIENT_ID}.`;
	const keys = Array.from({ length: storage.length }, (_, index) =>
		storage.key(index)
	).filter((key): key is string => key?.startsWith(keyPrefix) === true);

	for (const key of keys) {
		storage.removeItem(key);
	}
}

function userPool(): CognitoUserPool {
	pool ??= new CognitoUserPool({
		UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
		ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
		Storage:
			window.sessionStorage.getItem(REMEMBER_SESSION_KEY) === "false"
				? window.sessionStorage
				: window.localStorage,
	});

	return pool;
}

/**
 * Chooses where the next sign-in stores its Session. Remembered (the default)
 * keeps tokens in localStorage per ADR 0002; declining scopes them to the
 * browser tab via sessionStorage. The choice itself is kept in sessionStorage,
 * so a same-tab reload rebuilds the pool against the right storage while an
 * independently opened tab finds no session.
 */
function selectSessionStorage(remember: boolean): void {
	if (remember) {
		clearCognitoSession(window.sessionStorage);
		window.sessionStorage.removeItem(REMEMBER_SESSION_KEY);
	} else {
		clearCognitoSession(window.localStorage);
		window.sessionStorage.setItem(REMEMBER_SESSION_KEY, "false");
	}
	pool = null;
}

function cognitoUser(email: string): CognitoUser {
	return new CognitoUser({ Username: email, Pool: userPool() });
}

/**
 * Cognito's callbacks hand back loosely typed failures. Normalising them keeps
 * the message Cognito wrote, which is the part worth showing a person.
 */
function toError(value: unknown): Error {
	if (value instanceof Error) {
		return value;
	}

	if (
		typeof value === "object" &&
		value !== null &&
		"message" in value &&
		typeof value.message === "string"
	) {
		const error = new Error(value.message);

		if ("code" in value && typeof value.code === "string") {
			error.name = value.code;
		}

		return error;
	}

	return new Error(String(value));
}

function isUserNotConfirmed(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "UserNotConfirmedException"
	);
}

export function currentUser(): CognitoUser | null {
	return userPool().getCurrentUser();
}

/**
 * Resolves the current access token, refreshing it when the cached one has
 * expired. Returns null when there is no usable session at all.
 */
export async function accessToken(): Promise<string | null> {
	const user = currentUser();

	if (user === null) {
		return null;
	}

	return new Promise((resolve) => {
		user.getSession(
			(error: Error | null, session: CognitoUserSession | null) => {
				if (error !== null || session === null || !session.isValid()) {
					resolve(null);

					return;
				}

				resolve(session.getAccessToken().getJwtToken());
			}
		);
	});
}

export async function signIn(
	email: string,
	password: string,
	remember = true
): Promise<SignInOutcome> {
	selectSessionStorage(remember);
	const user = cognitoUser(email);

	return new Promise((resolve, reject) => {
		user.authenticateUser(
			new AuthenticationDetails({ Username: email, Password: password }),
			{
				onSuccess: () => {
					challengedUser = null;
					resolve({ status: "SIGNED_IN" });
				},
				onFailure: (error: unknown) => {
					if (isUserNotConfirmed(error)) {
						resolve({ status: "UNCONFIRMED" });

						return;
					}

					reject(toError(error));
				},
				newPasswordRequired: () => {
					challengedUser = user;
					resolve({ status: "NEW_PASSWORD_REQUIRED" });
				},
			}
		);
	});
}

/**
 * Answers the challenge every invited member meets on first sign-in, because
 * the API creates them with AdminCreateUser and an emailed temporary password.
 */
export async function completeNewPassword(password: string): Promise<void> {
	const user = challengedUser;

	if (user === null) {
		throw new Error("No password challenge is in progress.");
	}

	return new Promise((resolve, reject) => {
		user.completeNewPasswordChallenge(
			password,
			{},
			{
				onSuccess: () => {
					challengedUser = null;
					resolve();
				},
				onFailure: (error: unknown) => {
					reject(toError(error));
				},
			}
		);
	});
}

export function hasPendingPasswordChallenge(): boolean {
	return challengedUser !== null;
}

export async function confirmSignUp(
	email: string,
	code: string
): Promise<void> {
	return new Promise((resolve, reject) => {
		cognitoUser(email).confirmRegistration(code, true, (error: unknown) => {
			if (error === null || error === undefined) {
				resolve();

				return;
			}

			reject(toError(error));
		});
	});
}

export async function resendConfirmationCode(email: string): Promise<void> {
	return new Promise((resolve, reject) => {
		cognitoUser(email).resendConfirmationCode((error: unknown) => {
			if (error === null || error === undefined) {
				resolve();

				return;
			}

			reject(toError(error));
		});
	});
}

export async function forgotPassword(email: string): Promise<void> {
	return new Promise((resolve, reject) => {
		cognitoUser(email).forgotPassword({
			onSuccess: () => {
				resolve();
			},
			onFailure: (error: unknown) => {
				reject(toError(error));
			},
		});
	});
}

export async function confirmForgotPassword(
	email: string,
	code: string,
	password: string
): Promise<void> {
	return new Promise((resolve, reject) => {
		cognitoUser(email).confirmPassword(code, password, {
			onSuccess: () => {
				resolve();
			},
			onFailure: (error: unknown) => {
				reject(toError(error));
			},
		});
	});
}

export function signOut(): void {
	challengedUser = null;
	currentUser()?.signOut();
}
