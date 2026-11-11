import { describe, expect, it } from "vitest";
import { shiftsMissingTitles } from "@/features/scheduling/constraints/ConstraintDialog/shiftsMissingTitles";

const AM = { name: "Front desk AM", jobTitleIds: ["clerk", "lead"] };
const PM = { name: "Front desk PM", jobTitleIds: ["clerk"] };
const OLDER_API = { name: "Closing", jobTitleIds: [] };

describe("shiftsMissingTitles", () => {
	it("names no shift when each lists a counted job title", () => {
		expect(shiftsMissingTitles([AM, PM], ["clerk"])).toEqual([]);
	});

	it("names the one shift that lists none of them", () => {
		expect(shiftsMissingTitles([AM, PM], ["lead"])).toEqual(["Front desk PM"]);
	});

	it("names every shift that lists none of them", () => {
		expect(shiftsMissingTitles([AM, PM], ["supervisor"])).toEqual([
			"Front desk AM",
			"Front desk PM",
		]);
	});

	it("names nothing before a job title is chosen", () => {
		expect(shiftsMissingTitles([AM, PM], [])).toEqual([]);
	});

	it("never names a shift whose job titles are unknown", () => {
		expect(shiftsMissingTitles([OLDER_API], ["clerk"])).toEqual([]);
	});
});
