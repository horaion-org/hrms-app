import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	bulkAssignSummary,
	expiryBadge,
	expiryStatusOn,
	prefillExpiry,
	sortHeldSkills,
} from "@/features/skills/skillRules";

const t = authTestI18n.t;
const TODAY = "2026-11-05";

describe("expiryStatusOn", () => {
	it("is nothing for a skill that does not track expiry", () => {
		expect(
			expiryStatusOn({ tracksExpiry: false, expiresOn: null }, TODAY)
		).toBeUndefined();
	});

	it("is missing when the skill asks for a date nobody gave", () => {
		expect(
			expiryStatusOn({ tracksExpiry: true, expiresOn: null }, TODAY)
		).toEqual({ kind: "MISSING" });
	});

	it("is valid until the last day, then expired the day after", () => {
		expect(
			expiryStatusOn({ tracksExpiry: true, expiresOn: TODAY }, TODAY)
		).toEqual({ kind: "EXPIRING", daysLeft: 0 });
		expect(
			expiryStatusOn({ tracksExpiry: true, expiresOn: "2026-11-04" }, TODAY)
		).toEqual({ kind: "EXPIRED" });
	});

	it("is expiring within 30 days and valid beyond", () => {
		expect(
			expiryStatusOn({ tracksExpiry: true, expiresOn: "2026-12-05" }, TODAY)
		).toEqual({ kind: "EXPIRING", daysLeft: 30 });
		expect(
			expiryStatusOn({ tracksExpiry: true, expiresOn: "2026-12-06" }, TODAY)
		).toEqual({ kind: "VALID" });
	});
});

describe("expiryBadge", () => {
	it("reads each status with its tone", () => {
		expect(expiryBadge({ kind: "VALID" }, t)).toEqual({
			tone: "success",
			label: "Valid",
		});
		expect(expiryBadge({ kind: "EXPIRING", daysLeft: 1 }, t)).toEqual({
			tone: "warning",
			label: "Expires in 1 day",
		});
		expect(expiryBadge({ kind: "EXPIRING", daysLeft: 12 }, t).label).toBe(
			"Expires in 12 days"
		);
		expect(expiryBadge({ kind: "EXPIRED" }, t)).toEqual({
			tone: "error",
			label: "Expired",
		});
		expect(expiryBadge({ kind: "MISSING" }, t)).toEqual({
			tone: "error",
			label: "Expiry date missing",
		});
	});
});

describe("prefillExpiry", () => {
	it("ends the day before the same date that many months later", () => {
		expect(prefillExpiry("2026-03-01", 12)).toBe("2027-02-28");
		expect(prefillExpiry("2026-01-31", 1)).toBe("2026-02-27");
	});
});

describe("sortHeldSkills", () => {
	it("puts the highest proficiency first, unrated skills last, ties by name", () => {
		const sorted = sortHeldSkills([
			{ name: "Licence", proficiency: null },
			{ name: "baking", proficiency: 6 },
			{ name: "Forklift", proficiency: 8 },
			{ name: "Assembly", proficiency: 6 },
			{ name: "Armed escort", proficiency: null },
		]);
		expect(sorted.map((skill) => skill.name)).toEqual([
			"Forklift",
			"Assembly",
			"baking",
			"Armed escort",
			"Licence",
		]);
	});

	it("leaves the given list as it was", () => {
		const skills = [
			{ name: "B", proficiency: 1 },
			{ name: "A", proficiency: 9 },
		];
		sortHeldSkills(skills);
		expect(skills[0]?.name).toBe("B");
	});
});

describe("bulkAssignSummary", () => {
	it("says only the parts that happened", () => {
		expect(
			bulkAssignSummary({ assigned: 9, updated: 0, skipped: 0, full: 0 }, t)
		).toBe("Assigned to 9 people.");
		expect(
			bulkAssignSummary({ assigned: 1, updated: 1, skipped: 2, full: 1 }, t)
		).toBe(
			"Assigned to 1 person, updated 1, skipped 2 who already had it, 1 already has 50 skills."
		);
	});
});
