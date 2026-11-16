/*
 * The sections or groups a person closed on a page, remembered in this
 * browser as a list of their names (no personal data).
 */

/** The sections this browser remembers closed, or none remembered; storage that fails reads as none. */
export const rememberedClosed = (
	key: string,
	storage?: Pick<Storage, "getItem">
): Array<string> | undefined => {
	try {
		// Reading `window.localStorage` itself throws where storage is blocked.
		const store = storage ?? window.localStorage;
		const saved = store.getItem(key);
		if (saved === null) return undefined;
		const parsed: unknown = JSON.parse(saved);
		return Array.isArray(parsed)
			? parsed.filter((each): each is string => typeof each === "string")
			: undefined;
	} catch {
		return undefined;
	}
};

/** Remembers the closed sections; when storage fails, the page keeps them for this visit only. */
export const rememberClosed = (
	key: string,
	closed: ReadonlyArray<string>,
	storage?: Pick<Storage, "setItem">
): void => {
	try {
		const store = storage ?? window.localStorage;
		store.setItem(key, JSON.stringify(closed));
	} catch {
		// The page's own state keeps the choice until the next visit.
	}
};
