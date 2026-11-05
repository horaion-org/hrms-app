import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type QuoteProps = {
	/** Whose words these are, or what they answer, e.g. "Reason for rejection". */
	caption: string;
	/** The words, shown as written: their line breaks are kept. */
	children: string;
	className?: string;
};

/**
 * Someone else's words, quoted under a caption: a reviewer's reason, or the
 * engine's own explanation. Rendered as text, never as markup.
 */
export const Quote = ({
	caption,
	children,
	className,
}: QuoteProps): FunctionComponent => (
	<figure className={joinClassNames("text-sm", className)}>
		<figcaption className="font-semibold text-neutral-800">
			{caption}
		</figcaption>
		<blockquote className="mt-2 border-l-4 border-neutral-400 pl-4 whitespace-pre-line text-neutral-900">
			{children}
		</blockquote>
	</figure>
);
