import { useState } from "react";

/**
 * The browser-storage key that remembers the side menu was collapsed. It holds
 * only "true" or "false"; no personal data.
 */
export const MENU_COLLAPSED_KEY = "horaion.menuCollapsed";

/** Whether this browser collapsed the menu; storage that fails reads as expanded. */
export const isMenuCollapsed = (
	storage?: Pick<Storage, "getItem">
): boolean => {
	try {
		// Reading `window.localStorage` itself throws where storage is blocked.
		const store = storage ?? window.localStorage;
		return store.getItem(MENU_COLLAPSED_KEY) === "true";
	} catch {
		return false;
	}
};

/** Remembers the choice; when storage fails, the menu keeps it for this visit only. */
export const rememberMenuCollapsed = (
	collapsed: boolean,
	storage?: Pick<Storage, "setItem">
): void => {
	try {
		const store = storage ?? window.localStorage;
		store.setItem(MENU_COLLAPSED_KEY, String(collapsed));
	} catch {
		// The layout's own state keeps the choice until the next visit.
	}
};

/** The side menu's collapsed state, remembered for this browser; expanded by default. */
export const useMenuCollapsed = (): {
	collapsed: boolean;
	toggleCollapsed: () => void;
} => {
	const [collapsed, setCollapsed] = useState(() => isMenuCollapsed());
	const toggleCollapsed = (): void => {
		rememberMenuCollapsed(!collapsed);
		setCollapsed(!collapsed);
	};
	return { collapsed, toggleCollapsed };
};
