import { ApiProblemError, type ProblemDetail } from "@/common/problem";

/**
 * How the client reaches the Session without importing the auth feature,
 * which would make the dependency circular and the client awkward to test.
 */
export type ApiAuthentication = {
	/** The access pass to send, renewing it first when none is held. */
	accessToken: () => Promise<string | null>;
	/** Renews the access pass from the Session cookie; null when it has ended. */
	renew: () => Promise<string | null>;
	/** Called once a request is refused and renewal could not help. */
	onUnauthenticated: () => void;
};

type RequestOptions = {
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	body?: unknown;
	formData?: FormData;
	/** Public endpoints must not carry an Authorization header. */
	anonymous?: boolean;
	signal?: AbortSignal;
};

type Envelope<TData> = {
	success: boolean;
	data: TData;
	message: string;
	timestamp: string;
	path: string;
};

const UNAUTHORIZED = 401;

/**
 * A 401 with this code refuses a password the person just typed (turning MFA
 * off asks for it again), not the access pass, so it must not end the Session.
 */
const WRONG_PASSWORD = "INVALID_CREDENTIALS";

/**
 * The Session routes are the only ones that read or write the httpOnly Session
 * and Challenge cookies, so they alone are sent with credentials.
 */
const SESSION_ROUTES = "/api/v1/public/sessions";

const signedOut: ApiAuthentication = {
	accessToken: () => Promise.resolve(null),
	renew: () => Promise.resolve(null),
	onUnauthenticated: () => {},
};

let authentication: ApiAuthentication = signedOut;

/** Connects the client to the Session holder. Called once at startup. */
export function configureApiClient(configured: ApiAuthentication): void {
	authentication = configured;
}

/** Restores the signed-out default. For tests. */
export function resetApiClient(): void {
	authentication = signedOut;
}

function baseUrl(): string {
	return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "");
}

function buildHeaders(options: RequestOptions, token: string | null): Headers {
	const headers = new Headers({ Accept: "application/json" });

	if (options.body !== undefined) {
		headers.set("Content-Type", "application/json");
	}

	if (token !== null) {
		headers.set("Authorization", `Bearer ${token}`);
	}

	return headers;
}

async function readProblem(response: Response): Promise<ProblemDetail> {
	try {
		return (await response.json()) as ProblemDetail;
	} catch {
		return { status: response.status, title: response.statusText };
	}
}

/** Whether a 401 refuses the access pass rather than something the person typed. */
async function refusesAccessPass(response: Response): Promise<boolean> {
	if (response.status !== UNAUTHORIZED) {
		return false;
	}

	const problem = await readProblem(response.clone());

	return problem.errorCode !== WRONG_PASSWORD;
}

function retryAfter(response: Response): number | undefined {
	const seconds = Number.parseInt(
		response.headers.get("Retry-After") ?? "",
		10
	);

	return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

async function toProblemError(response: Response): Promise<ApiProblemError> {
	return new ApiProblemError(
		response.status,
		await readProblem(response),
		retryAfter(response)
	);
}

/** Unwraps the `ApiResponse` envelope; 202 and 204 carry no body. */
async function readData<TData>(response: Response): Promise<TData> {
	const text = await response.text();

	if (text === "") {
		return undefined as TData;
	}

	return (JSON.parse(text) as Envelope<TData>).data;
}

/**
 * Performs one API call and unwraps the `ApiResponse` envelope. Any
 * non-success status is thrown as an {@link ApiProblemError}.
 *
 * Unless `anonymous`, the call carries the access pass. A 401 renews the pass
 * once and retries; if that cannot help, the Session is treated as ended. A
 * 401 for a wrong password is only thrown.
 */
export async function apiRequest<TData>(
	path: string,
	options: RequestOptions = {}
): Promise<TData> {
	const send = (token: string | null): Promise<Response> =>
		fetch(`${baseUrl()}${path}`, {
			method: options.method ?? "GET",
			headers: buildHeaders(options, token),
			body:
				options.formData ??
				(options.body === undefined ? undefined : JSON.stringify(options.body)),
			credentials: path.startsWith(SESSION_ROUTES) ? "include" : "same-origin",
			signal: options.signal,
		});

	let response: Response;

	if (options.anonymous === true) {
		response = await send(null);
	} else {
		response = await send(await authentication.accessToken());

		if (await refusesAccessPass(response)) {
			const renewed = await authentication.renew().catch(() => null);

			if (renewed !== null) {
				response = await send(renewed);
			}

			if (await refusesAccessPass(response)) {
				authentication.onUnauthenticated();
			}
		}
	}

	if (!response.ok) {
		throw await toProblemError(response);
	}

	return readData<TData>(response);
}
