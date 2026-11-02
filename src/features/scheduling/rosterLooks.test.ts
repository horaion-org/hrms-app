import { describe, expect, it } from "vitest";
import { shiftTileStyle } from "@/features/scheduling/rosterLooks";

describe("shiftTileStyle", () => {
	it.each([
		["#E9A55A", "rgb(252, 242, 230)"],
		["#000000", "rgb(217, 217, 217)"],
		["#FFFFFF", "rgb(255, 255, 255)"],
	])(
		"given_%s_when_styled_then_bordersWithItOverALightTint",
		(colour, tint) => {
			expect(shiftTileStyle(colour)).toEqual({
				borderColor: colour,
				backgroundColor: tint,
			});
		}
	);
});
