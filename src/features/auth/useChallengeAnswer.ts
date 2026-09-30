import { useEffect, useRef, useState, type RefObject } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ApiProblemError } from "@/common/problem";
import { challengePath } from "@/features/auth/challenge";
import { failureMessage, retryHoldMessage } from "@/features/auth/errors";
import { returnPath } from "@/features/auth/returnPath";
import { answerChallenge, type ChallengeAnswer } from "@/features/auth/session";
import { useRetryHold } from "@/features/auth/useRetryHold";

/** Both screens share navigation and retry handling, with field wording owned locally. */
export function useChallengeAnswer(refuseField: (message: string) => void): {
	answer: (values: ChallengeAnswer) => Promise<void>;
	held: boolean;
	message: string | null;
	messageContainer: RefObject<HTMLDivElement | null>;
} {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const search = useSearch({ strict: false });
	const [failure, setFailure] = useState<unknown>(null);
	const [message, setMessage] = useState<string | null>(null);
	const hold = useRetryHold(failure);
	const inFlight = useRef(false);
	const messageContainer = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (message) messageContainer.current?.focus();
	}, [message]);
	const releaseSubmission = (): void => {
		inFlight.current = false;
	};
	const answer = async (values: ChallengeAnswer): Promise<void> => {
		if (inFlight.current || hold.held) return;
		inFlight.current = true;
		setFailure(null);
		setMessage(null);
		try {
			const outcome = await answerChallenge(values);
			switch (outcome.kind) {
				case "session":
					await navigate({ href: returnPath(search.redirect) });
					break;
				case "challenge":
					await navigate({
						to: challengePath(outcome.challenge),
						search: { redirect: returnPath(search.redirect) },
					});
					break;
				default: {
					const exhaustive: never = outcome;
					return exhaustive;
				}
			}
		} catch (cause) {
			setFailure(cause);
			if (cause instanceof ApiProblemError) {
				if (cause.reason === "challenge-expired") {
					await navigate({
						to: "/login",
						search: {
							redirect: returnPath(search.redirect),
							challengeExpired: true,
						},
					});
					return;
				}
				// The shared reason map words these for the emailed-code screens; a Challenge has its own copy.
				if (cause.reason === "invalid-code" && "code" in values) {
					refuseField(t("auth.challenge.invalidCode"));
					return;
				}
				if (
					cause.reason === "password-policy-violation" &&
					"newPassword" in values
				) {
					refuseField(t("auth.challenge.passwordRejected"));
					return;
				}
			}
			setMessage(failureMessage(cause, t));
		} finally {
			releaseSubmission();
		}
	};
	return {
		answer,
		held: hold.held,
		messageContainer,
		message:
			failure instanceof ApiProblemError && failure.status === 429
				? retryHoldMessage(hold.message, t)
				: message,
	};
}
