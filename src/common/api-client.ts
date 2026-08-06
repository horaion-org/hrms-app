import { ApiProblemError, type ProblemDetail } from "@/common/problem";

type AccessTokenProvider = () => Promise<string | null>;

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

const NO_CONTENT = 204;

let accessTokenProvider: AccessTokenProvider = () => Promise.resolve(null);

/**
 * Supplies the client with a way to obtain a bearer token. Called once at
 * startup so this module never imports the auth feature, which would make the
 * dependency circular and the client awkward to test.
 */
export function configureApiClient(provider: AccessTokenProvider): void {
	accessTokenProvider = provider;
}

function baseUrl(): string {
	return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "");
}

async function buildHeaders(options: RequestOptions): Promise<Headers> {
	const headers = new Headers({ Accept: "application/json" });

	if (options.body !== undefined) {
		headers.set("Content-Type", "application/json");
	}

	if (options.anonymous !== true) {
		const token = await accessTokenProvider();

		if (token !== null) {
			headers.set("Authorization", `Bearer ${token}`);
		}
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

/**
 * Performs one API call and unwraps the `ApiResponse` envelope. Any
 * non-success status is thrown as an {@link ApiProblemError}.
 */
export async function apiRequest<TData>(
	path: string,
	options: RequestOptions = {}
): Promise<TData> {
	const response = await fetch(`${baseUrl()}${path}`, {
		method: options.method ?? "GET",
		headers: await buildHeaders(options),
		body:
			options.formData ??
			(options.body === undefined ? undefined : JSON.stringify(options.body)),
		signal: options.signal,
	});

	if (!response.ok) {
		throw new ApiProblemError(response.status, await readProblem(response));
	}

	if (response.status === NO_CONTENT) {
		return undefined as TData;
	}

	const envelope = (await response.json()) as Envelope<TData>;

	return envelope.data;
}
