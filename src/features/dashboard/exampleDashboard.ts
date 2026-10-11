/*
 * Figures the Dashboard shows before their services exist: the workforce
 * split and schedule coverage. The page labels them as example data. Swap
 * `exampleWorkforce` for an API read once one exists.
 */

export type Workforce = {
	active: number;
	onShift: number;
	onCall: number;
	remote: number;
	/** Share of shifts filled, 0–100. */
	coverage: number;
};

export const exampleWorkforce = (): Workforce => ({
	active: 1620,
	onShift: 842,
	onCall: 156,
	remote: 286,
	coverage: 98.2,
});

/** Notifications with no API yet, shown as examples with their actions off. */
export const EXAMPLE_NOTIFICATIONS = ["shiftSwap", "staffShortage"] as const;

export type ExampleNotification = (typeof EXAMPLE_NOTIFICATIONS)[number];
