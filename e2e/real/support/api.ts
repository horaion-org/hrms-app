import { APP_URL } from "./environment";

/** One API answer: the HTTP status, the parsed JSON body (or null) and the raw text for diagnostics. */
export type ApiResult<T = any> = {
	status: number;
	body: T;
	data: any;
	errorCode: string | undefined;
	text: string;
};

const SESSIONS_PATH = "/api/v1/public/sessions";

/**
 * A signed-in API caller for one person, talking to the backend through the app's own origin (the vite proxy),
 * exactly as the browser does. Company routes are written relative to the company (`~/schedules`).
 */
export class ApiClient {
	constructor(
		private readonly accessToken: string,
		public companyId: string | undefined = undefined,
		private readonly baseUrl: string = APP_URL
	) {}

	/** Signs in through the cookie route and returns a client holding the access token. */
	static async signIn(email: string, password: string, baseUrl: string = APP_URL): Promise<ApiClient> {
		const response = await fetch(`${baseUrl}${SESSIONS_PATH}`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Origin: baseUrl },
			body: JSON.stringify({ email, password }),
		});
		const body = (await response.json()) as { data?: { accessToken?: string } } | null;
		const token = body?.data?.accessToken;
		if (!token) {
			throw new Error(`Sign-in for ${email} failed: ${response.status} ${JSON.stringify(body).slice(0, 300)}`);
		}
		return new ApiClient(token, undefined, baseUrl);
	}

	/** The `sub` claim of the access token: the person's identity subject. */
	subject(): string {
		const payload = JSON.parse(Buffer.from(this.accessToken.split(".")[1] ?? "", "base64url").toString("utf8")) as { sub: string };
		return payload.sub;
	}

	withCompany(companyId: string): ApiClient {
		return new ApiClient(this.accessToken, companyId, this.baseUrl);
	}

	get<T = any>(path: string) {
		return this.send<T>("GET", path);
	}
	post<T = any>(path: string, body?: unknown) {
		return this.send<T>("POST", path, body);
	}
	put<T = any>(path: string, body?: unknown) {
		return this.send<T>("PUT", path, body);
	}
	patch<T = any>(path: string, body?: unknown) {
		return this.send<T>("PATCH", path, body);
	}
	delete<T = any>(path: string) {
		return this.send<T>("DELETE", path);
	}

	/** Sends a multipart form (file uploads). */
	async upload(path: string, form: FormData): Promise<ApiResult> {
		const response = await fetch(this.url(path), {
			method: "POST",
			headers: { Authorization: `Bearer ${this.accessToken}` },
			body: form,
		});
		return toResult(response);
	}

	/** Downloads a binary body (templates, exports). */
	async download(path: string): Promise<{ status: number; bytes: Buffer; contentType: string | null }> {
		const response = await fetch(this.url(path), { headers: { Authorization: `Bearer ${this.accessToken}` } });
		return {
			status: response.status,
			bytes: Buffer.from(await response.arrayBuffer()),
			contentType: response.headers.get("content-type"),
		};
	}

	private url(path: string): string {
		const resolved = path.startsWith("~") ? `/api/v1/companies/${this.companyId}${path.slice(1)}` : path;
		return `${this.baseUrl}${resolved}`;
	}

	/**
	 * Sends one request. A 503 DECISION_ENGINE_STALE (OPA still on the previous bundle revision for 1–5 s after a
	 * facts change, ADR-0023) is retried for up to 10 s, as the app's own client does; every other answer is returned.
	 */
	private async send<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
		for (let attempt = 0; ; attempt++) {
			const response = await fetch(this.url(path), {
				method,
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
					...(body === undefined ? {} : { "Content-Type": "application/json" }),
				},
				body: body === undefined ? undefined : JSON.stringify(body),
			});
			const result = await toResult<T>(response);
			if (result.status !== 503 || result.errorCode !== "DECISION_ENGINE_STALE" || attempt >= 20) return result;
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}
}

async function toResult<T>(response: Response): Promise<ApiResult<T>> {
	const text = await response.text();
	let body: any = null;
	try {
		body = text ? JSON.parse(text) : null;
	} catch {
		body = null;
	}
	return { status: response.status, body, data: body?.data, errorCode: body?.errorCode, text };
}

/** Throws with the answer's text unless the status is the expected one; returns `data`. */
export function expectStatus(result: ApiResult, expected: number, label: string): any {
	if (result.status !== expected) {
		throw new Error(`${label}: expected ${expected}, got ${result.status} ${result.text.slice(0, 500)}`);
	}
	return result.data;
}

/** The rows of a page answer (`content`) or a plain list. */
export function rowsOf(data: any): any[] {
	if (Array.isArray(data)) return data;
	return data?.content ?? data?.items ?? [];
}
