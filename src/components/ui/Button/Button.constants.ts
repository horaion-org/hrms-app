/*
 * The Button's variants and sizes, kept out of `Button.tsx` so that file only
 * exports components (`react-refresh/only-export-components`).
 */

/** Labelled variants that accept the shared size and accessory icon props. */
export const buttonVariants = [
	"primary",
	"secondary",
	"textlink",
	"hyperlink",
] as const;

export const buttonSizes = ["lg", "sm"] as const;

export type ButtonVariant = (typeof buttonVariants)[number] | "icon";
export type ButtonSize = (typeof buttonSizes)[number];
