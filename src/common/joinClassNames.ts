/** Joins the class names that are set, skipping `undefined`, `false` and empty strings. */
export const joinClassNames = (
	...classNames: Array<string | false | null | undefined>
): string => classNames.filter(Boolean).join(" ");
