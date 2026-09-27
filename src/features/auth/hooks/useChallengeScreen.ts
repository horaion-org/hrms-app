import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	pendingChallengeKind,
	type ChallengeKind,
} from "@/features/auth/session";

/** The copy of one Challenge page, with and without a pending Challenge. */
const COPY = {
	SOFTWARE_TOKEN_MFA: {
		title: "auth.mfa.title",
		description: "auth.mfa.subtitle",
		noChallengeTitle: "auth.mfa.noChallengeTitle",
		noChallengeDescription: "auth.mfa.noChallengeSubtitle",
		back: "auth.mfa.back",
	},
	NEW_PASSWORD_REQUIRED: {
		title: "auth.newPassword.title",
		description: "auth.newPassword.subtitle",
		noChallengeTitle: "auth.newPassword.noChallengeTitle",
		noChallengeDescription: "auth.newPassword.noChallengeSubtitle",
		back: "auth.newPassword.back",
	},
} as const;

export type ChallengeScreen = {
	/** Whether this tab is answering this kind of Challenge. */
	pending: boolean;
	title: string;
	description: string;
	/** The label of the link back to sign-in. */
	back: string;
};

/**
 * What a Challenge page shows. Without a pending Challenge of `kind` (say,
 * after a reload, which forgets it), the page explains that and offers only
 * the way back to sign-in. Read once, on mount: a refusal that ends the
 * Challenge keeps the form and its error on screen.
 */
export const useChallengeScreen = (kind: ChallengeKind): ChallengeScreen => {
	const { t } = useTranslation();
	const [pending] = useState(() => pendingChallengeKind() === kind);
	const copy = COPY[kind];

	return {
		pending,
		title: t(pending ? copy.title : copy.noChallengeTitle),
		description: t(pending ? copy.description : copy.noChallengeDescription),
		back: t(copy.back),
	};
};
