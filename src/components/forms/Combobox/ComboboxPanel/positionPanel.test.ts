import { expect, it } from "vitest";
import { positionPanel } from "@/components/forms/Combobox/ComboboxPanel/positionPanel";
it("opens below when space allows and flips upward otherwise", () => {
	expect(
		positionPanel({ left: 20, top: 40, bottom: 84, width: 300 }, 300, 800, 640)
	).toEqual({ left: 20, top: 88, width: 300, maxHeight: 544 });
	expect(
		positionPanel(
			{ left: 20, top: 580, bottom: 624, width: 300 },
			300,
			800,
			640
		)
	).toEqual({ left: 20, top: 276, width: 300, maxHeight: 568 });
});
it("clamps panels when the trigger scrolls outside the viewport", () => {
	const result = positionPanel(
		{ left: 20, top: 900, bottom: 944, width: 300 },
		300,
		800,
		640
	);
	expect(result.top).toBe(332);
	expect(result.maxHeight).toBe(624);
});
it("clamps narrow viewport width and limits tall panels to available space", () => {
	expect(
		positionPanel(
			{ left: 250, top: 80, bottom: 124, width: 400 },
			700,
			320,
			480
		)
	).toEqual({ left: 8, top: 128, width: 304, maxHeight: 344 });
});
