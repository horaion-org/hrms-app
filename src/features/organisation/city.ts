/** Matches the server's Unicode whitespace collapse, preserving letter case. */
export const normalizeBranchCity = (value: string): string =>
	value.replace(/\p{White_Space}+/gu, " ").replace(/^ +| +$/g, "");
