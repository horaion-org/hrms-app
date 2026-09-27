import type { TFunction } from "i18next";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiProblemError } from "@/common/problem";

/** Error codes of the credential routes, with their translation keys. */
const CODE_MESSAGES = {
	INVALID_CREDENTIALS: "auth.errors.invalidCredentials",
	SESSION_EXPIRED: "auth.errors.sessionExpired",
	CHALLENGE_EXPIRED: "auth.errors.challengeExpired",
	INVALID_CODE: "auth.errors.invalidCode",
	PASSWORD_POLICY_VIOLATION: "auth.errors.passwordPolicyViolation",
	MFA_ALREADY_ENABLED: "auth.errors.mfaAlreadyEnabled",
} as const;

const isKnownCode = (code: string): code is keyof typeof CODE_MESSAGES =>
	code in CODE_MESSAGES;

/**
 * A translated message for a known error code, or undefined to fall back to
 * the API's own wording. A refusal for too many attempts says how long to
 * wait when the API told us.
 */
export const problemMessage = (
	cause: ApiProblemError,
	t: TFunction
): string | undefined => {
	if (cause.errorCode === "RATE_LIMITED" || cause.status === 429) {
		return cause.retryAfterSeconds === undefined
			? t("auth.errors.rateLimited")
			: t("auth.errors.rateLimitedFor", { count: cause.retryAfterSeconds });
	}

	const code = cause.errorCode;

	return code !== undefined && isKnownCode(code)
		? t(CODE_MESSAGES[code])
		: undefined;
};

/** Turns an API field name (`display_name`) into its form field (`displayName`). */
const toFormField = (field: string): string =>
	field.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());

/**
 * Puts a failed request's message on the form: the API's per-field errors on
 * their fields, a known error code on the field it concerns, and anything else
 * on `fallbackField`. Messages from the API are written for people, so they
 * are shown as they come, unless `t` is given and the code has a translation;
 * any other failure shows `fallbackMessage`.
 */
export const showFailure = <TValues extends FieldValues>(
	cause: unknown,
	setError: UseFormSetError<TValues>,
	options: {
		fields: ReadonlyArray<Path<TValues>>;
		fallbackField: Path<TValues>;
		fallbackMessage: string;
		errorCodeFields?: Partial<Record<string, Path<TValues>>>;
		t?: TFunction;
	}
): void => {
	const {
		fields,
		fallbackField,
		fallbackMessage,
		errorCodeFields = {},
		t,
	} = options;
	const isField = (name: string): name is Path<TValues> =>
		(fields as ReadonlyArray<string>).includes(name);

	if (cause instanceof ApiProblemError) {
		const fieldErrors = cause.fieldErrors.filter((fieldError) =>
			isField(toFormField(fieldError.field))
		);

		if (fieldErrors.length > 0) {
			for (const fieldError of fieldErrors) {
				setError(toFormField(fieldError.field) as Path<TValues>, {
					message: fieldError.message,
				});
			}

			return;
		}

		const codeField =
			cause.errorCode === undefined
				? undefined
				: errorCodeFields[cause.errorCode];
		setError(codeField ?? fallbackField, {
			message:
				(t === undefined ? undefined : problemMessage(cause, t)) ??
				cause.message,
		});

		return;
	}

	// Anything but the API's own refusal (a network TypeError, unparsable JSON)
	// speaks to developers, not to the person filling in the form.
	setError(fallbackField, { message: fallbackMessage });
};

/**
 * A failure's message for a toast: a translated error code, else the API's own
 * wording, else `fallbackMessage`.
 */
export const failureMessage = (
	cause: unknown,
	t: TFunction,
	fallbackMessage: string
): string => {
	if (cause instanceof ApiProblemError) {
		return problemMessage(cause, t) ?? cause.message;
	}

	return fallbackMessage;
};
