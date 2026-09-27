/*
 * The Link's variants, kept out of `Link.tsx` so that file only exports
 * components (`react-refresh/only-export-components`).
 */
export const linkVariants = ["action", "muted"] as const;

export type LinkVariant = (typeof linkVariants)[number];
