import { useId, type ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type TermsFormPartProps = {
	/** The part's short plain heading, such as "Working week". */
	title: string;
	children: ReactNode;
	className?: string;
};

/**
 * One of the terms dialog's three parts: a heading, then its fields one under
 * another with the dialog's one gap. Every part looks alike, so none runs into
 * the next.
 */
export const TermsFormPart = ({
	title,
	children,
	className,
}: TermsFormPartProps): FunctionComponent => {
	const headingId = useId();
	return (
		<section
			aria-labelledby={headingId}
			className={joinClassNames("flex min-w-0 flex-col gap-5", className)}
		>
			<h3
				className="text-lg font-semibold text-neutral-900"
				id={headingId}
			>
				{title}
			</h3>
			{children}
		</section>
	);
};
