import type { ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type ErrorTextProps = {
	/** Why something didn't go through; one short sentence reads best. */
	children: ReactNode;
	/** Spacing from what is around it, e.g. `mt-6`. */
	className?: string;
};

/**
 * A failure said in place, beside what failed, and announced as it appears.
 * For a whole page or list that can't be shown, say so in the body tone
 * instead; this is for an action or a read that didn't go through.
 */
export const ErrorText = ({
	children,
	className,
}: ErrorTextProps): FunctionComponent => (
	<p
		className={joinClassNames("text-sm text-error-700", className)}
		role="alert"
	>
		{children}
	</p>
);
