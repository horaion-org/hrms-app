import { useId } from "react";
import type { FunctionComponent, Heroicon } from "@/common/types";

/**
 * A closed padlock: something set above you that you cannot change or remove,
 * such as a company constraint locked for every department. Same contract as
 * the generated icons in `@/components/ui/Icon` (24×24 viewBox, inherits text
 * colour, decorative unless titled); kept beside them because that set is
 * generated from the design sheet, which has no lock yet. When the sheet gains
 * one, the generated icon replaces this component.
 */
export const LockIcon: Heroicon = ({
	title,
	titleId,
	...props
}): FunctionComponent => {
	const generatedId = useId();
	const accessibleTitleId = titleId ?? generatedId;
	return (
		<svg
			aria-hidden={title ? undefined : true}
			aria-labelledby={title ? accessibleTitleId : undefined}
			fill="none"
			role={title ? "img" : undefined}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			{title ? <title id={accessibleTitleId}>{title}</title> : null}
			<path
				d="M7.5 10.5V7.5C7.5 5.01472 9.51472 3 12 3C14.4853 3 16.5 5.01472 16.5 7.5V10.5"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.5"
			/>
			<path
				d="M17.25 10.5H6.75C5.92157 10.5 5.25 11.1716 5.25 12V19.5C5.25 20.3284 5.92157 21 6.75 21H17.25C18.0784 21 18.75 20.3284 18.75 19.5V12C18.75 11.1716 18.0784 10.5 17.25 10.5Z"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.5"
			/>
		</svg>
	);
};
