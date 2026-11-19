import { describe, expect, it } from "vitest";
import { requirementTagTone } from "@/features/scheduling/constraints/requirementTagTones";

describe("requirementTagTone", () => {
	it("given_aMust_when_toned_then_neutral", () => {
		expect(requirementTagTone("MUST")).toBe("neutral");
	});

	it("given_anIfPossible_when_toned_then_warning", () => {
		expect(requirementTagTone("SHOULD")).toBe("warning");
	});

	it("given_noneChosenOrAnUnknownRequirement_when_toned_then_neutral", () => {
		expect(requirementTagTone(null)).toBe("neutral");
		expect(requirementTagTone("PREFERRED")).toBe("neutral");
	});
});
