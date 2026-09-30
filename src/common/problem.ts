import { z } from "zod";

export type ProblemReason =
	| "invalid-code"
	| "password-policy-violation"
	| "challenge-expired"
	| "invalid-credentials"
	| "email-not-confirmed"
	| "validation"
	| "unauthenticated"
	| "forbidden"
	| "rate-limited"
	| "http";

const problemSchema = z.object({
	errorCode: z.string().optional().catch(undefined),
	errors: z
		.array(z.object({ field: z.string(), message: z.string() }))
		.catch([]),
});

type ProblemOptions = {
	status: number;
	errorCode?: string;
	fieldErrors: ReadonlyArray<{ field: string; message: string }>;
	retryAfterSeconds?: number;
	reason: ProblemReason;
};

export class ApiProblemError extends Error {
	public override name = "ApiProblemError";
	public readonly status: number;
	public readonly errorCode: string | undefined;
	public readonly fieldErrors: ReadonlyArray<{
		field: string;
		message: string;
	}>;
	public readonly retryAfterSeconds: number | undefined;
	public readonly reason: ProblemReason;

	public constructor({
		message,
		...options
	}: ProblemOptions & { message: string }) {
		super(message);
		this.status = options.status;
		this.errorCode = options.errorCode;
		this.fieldErrors = options.fieldErrors;
		this.retryAfterSeconds = options.retryAfterSeconds;
		this.reason = options.reason;
	}
}

export class UnreachableError extends Error {
	public override name = "UnreachableError";
	public readonly reason = "unreachable";
}

export class UnexpectedResponseError extends Error {
	public override name = "UnexpectedResponseError";
	public readonly reason = "unexpected-response";
}

function reasonOf(status: number, errorCode?: string): ProblemReason {
	if (errorCode === "EMAIL_NOT_VERIFIED") return "email-not-confirmed";
	if (errorCode === "INVALID_CODE") return "invalid-code";
	if (errorCode === "CHALLENGE_EXPIRED") return "challenge-expired";
	if (errorCode === "INVALID_CREDENTIALS") return "invalid-credentials";
	if (errorCode === "PASSWORD_POLICY_VIOLATION")
		return "password-policy-violation";
	switch (status) {
		case 400:
			return "validation";
		case 401:
			return "unauthenticated";
		case 403:
			return "forbidden";
		case 429:
			return "rate-limited";
		default:
			return "http";
	}
}

function retryAfter(value: string | null): number | undefined {
	if (value === null) return undefined;
	if (/^\d+$/.test(value.trim())) return Number(value);
	// Retry-After also permits an HTTP date.
	if (!/^[A-Za-z]{3},/.test(value)) return undefined;
	const date = Date.parse(value);
	return Number.isFinite(date)
		? Math.max(0, Math.ceil((date - Date.now()) / 1000))
		: undefined;
}

export async function readProblem(
	response: Response
): Promise<ApiProblemError> {
	const body: unknown = await response.json().catch(() => undefined);
	const parsed = problemSchema.safeParse(body);
	const errorCode = parsed.success ? parsed.data.errorCode : undefined;
	return new ApiProblemError({
		message: "API request refused",
		status: response.status,
		errorCode,
		fieldErrors: parsed.success ? parsed.data.errors : [],
		retryAfterSeconds: retryAfter(response.headers.get("Retry-After")),
		reason: reasonOf(response.status, errorCode),
	});
}
