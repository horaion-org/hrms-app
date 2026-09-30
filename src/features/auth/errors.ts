import type { ParseKeys, TFunction } from "i18next";
import {
	ApiProblemError,
	UnreachableError,
	UnexpectedResponseError,
	type ProblemReason,
} from "@/common/problem";

import { retryMessage, type RetryMessage } from "@/features/auth/useRetryHold";

export function retryHoldMessage(message: RetryMessage, t: TFunction): string {
	switch (message.kind) {
		case "later":
			return t("auth.retryHold.later");
		case "about-a-minute":
			return t("auth.retryHold.aboutAMinute");
		case "minutes":
			return t("auth.retryHold.minutes", { count: message.count });
		default: {
			const exhaustive: never = message;
			return exhaustive;
		}
	}
}

type Reason = ProblemReason | "unreachable" | "unexpected-response";
const messages = {
	"email-not-confirmed": "auth.emailConfirmation.required",
	"invalid-code": "auth.errors.invalidCode",
	"challenge-expired": "auth.challenge.expired",
	"invalid-credentials": "auth.errors.invalidCredentials",
	"password-policy-violation": "auth.passwordReset.passwordPolicy",
	validation: "auth.errors.generic",
	unauthenticated: "auth.errors.generic",
	forbidden: "auth.errors.generic",
	"rate-limited": "auth.retryHold.later",
	http: "auth.errors.generic",
	unreachable: "auth.errors.unreachable",
	"unexpected-response": "auth.errors.generic",
} satisfies Record<Reason, ParseKeys>;

export function failureMessage(cause: unknown, t: TFunction): string {
	if (cause instanceof ApiProblemError && cause.status === 429)
		return retryHoldMessage(retryMessage(cause.retryAfterSeconds), t);
	const reason =
		cause instanceof ApiProblemError ||
		cause instanceof UnreachableError ||
		cause instanceof UnexpectedResponseError
			? cause.reason
			: "http";
	return t(messages[reason]);
}
