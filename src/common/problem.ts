/**
 * RFC 7807 problem detail, as returned by the API's global exception handler.
 * `errorCode` is a Horaion extension (camelCase: problem properties bypass the
 * API's snake_case naming strategy); branch on it rather than on `detail`,
 * which is human-facing prose and may be reworded.
 */
export type ProblemDetail = {
	type?: string;
	title?: string;
	status?: number;
	detail?: string;
	instance?: string;
	errorCode?: string;
	errors?: Array<{ field: string; message: string }>;
};

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

/** An API response that was not successful. */
export class ApiProblemError extends Error {
	public readonly status: number;
	public readonly errorCode: string | undefined;
	public readonly fieldErrors: Array<{ field: string; message: string }>;

	// eslint-disable-next-line unicorn/custom-error-definition -- built from an HTTP status and RFC 7807 body, not (message, ErrorOptions)
	public constructor(status: number, problem: ProblemDetail) {
		super(problem.detail ?? problem.title ?? FALLBACK_MESSAGE);

		this.name = "ApiProblemError";
		this.status = status;
		this.errorCode = problem.errorCode;
		this.fieldErrors = problem.errors ?? [];
	}

	/** True when the API refused the action rather than failing to perform it. */
	public get isForbidden(): boolean {
		return this.status === 403;
	}

	public get isUnauthenticated(): boolean {
		return this.status === 401;
	}

	public get isNotFound(): boolean {
		return this.status === 404;
	}

	public get isConflict(): boolean {
		return this.status === 409;
	}
}
