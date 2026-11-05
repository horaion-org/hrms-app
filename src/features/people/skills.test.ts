import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	MAX_SKILLS,
	measureOf,
	skillFormSchema,
	skillsRefusal,
	skillValueOf,
	valueOf,
	withChangedHolding,
	withHolding,
	withoutHolding,
} from "@/features/people/skills";
import {
	heldLicenceFixture,
	heldSkillFixture,
} from "@/features/skills/fixtures";

const t = authTestI18n.t;
const problem = (
	status: number,
	errorCode?: string,
	fields: Array<string> = []
): ApiProblemError =>
	new ApiProblemError({
		message: "API says no",
		status,
		errorCode,
		fieldErrors: fields.map((field) => ({ field, message: "API says no" })),
		reason: "http",
	});
const forklift = heldSkillFixture({ notes: "Trains new starters" });
const licence = heldLicenceFixture();
const form = {
	name: "Forklift",
	proficiency: 6,
	notes: "  ",
	issuedOn: "2026-03-01",
	expiresOn: "2027-02-28",
};

describe("a held skill sent back", () => {
	it("carries a rating only when rated and dates only when tracking expiry", () => {
		expect(valueOf(forklift)).toEqual({
			name: "Forklift",
			proficiency: 8,
			notes: "Trains new starters",
			issuedOn: null,
			expiresOn: null,
		});
		expect(valueOf(licence)).toEqual({
			name: "Security Officer Licence",
			proficiency: null,
			notes: null,
			issuedOn: "2026-03-01",
			expiresOn: "2027-02-28",
		});
		// A scale newer than the app is never sent a rating.
		expect(
			valueOf(heldSkillFixture({ proficiencyScale: "UNKNOWN" })).proficiency
		).toBeNull();
	});

	it("builds the complete set for an add, a change and a removal", () => {
		const added = skillValueOf(form, { rated: true, tracksExpiry: false });
		expect(
			withHolding([forklift, licence], { ...added, name: "Mandarin" })
		).toHaveLength(3);
		expect(
			withChangedHolding([forklift, licence], { ...added, name: "forklift" })
		).toEqual([{ ...added, name: "forklift" }, valueOf(licence)]);
		expect(withoutHolding([forklift, licence], "FORKLIFT")).toEqual([
			valueOf(licence),
		]);
	});
});

describe("the skill form", () => {
	it("sends empty notes as null and only what the skill is measured by", () => {
		expect(skillValueOf(form, { rated: true, tracksExpiry: false })).toEqual({
			name: "Forklift",
			proficiency: 6,
			notes: null,
			issuedOn: null,
			expiresOn: null,
		});
		expect(
			skillValueOf({ ...form, issuedOn: "" }, measureOf(heldLicenceFixture()))
		).toEqual({
			name: "Forklift",
			proficiency: null,
			notes: null,
			issuedOn: null,
			expiresOn: "2027-02-28",
		});
	});

	it("needs an expiry on or after the issue date for a skill tracking expiry", () => {
		const schema = skillFormSchema(t, {
			measure: { rated: false, tracksExpiry: true },
			taken: [],
			editing: false,
		});
		expect(schema.safeParse({ ...form, expiresOn: "" }).success).toBe(false);
		expect(schema.safeParse({ ...form, expiresOn: "2026-02-28" }).success).toBe(
			false
		);
		expect(schema.safeParse(form).success).toBe(true);
	});

	it("never gives a skill twice, nor past the limit, but lets a held one change", () => {
		const adding = skillFormSchema(t, {
			measure: { rated: true, tracksExpiry: false },
			taken: ["forklift"],
			editing: false,
		});
		expect(adding.safeParse(form).success).toBe(false);
		const full = skillFormSchema(t, {
			measure: { rated: true, tracksExpiry: false },
			taken: Array.from({ length: MAX_SKILLS }, (_, index) => `S${index}`),
			editing: false,
		});
		expect(full.safeParse({ ...form, name: "New" }).success).toBe(false);
		const editing = skillFormSchema(t, {
			measure: { rated: true, tracksExpiry: false },
			taken: ["Forklift"],
			editing: true,
		});
		expect(editing.safeParse(form).success).toBe(true);
	});
});

describe("skillsRefusal", () => {
	it("asks to reload on any 409", () => {
		expect(skillsRefusal(problem(409), t, 0).message).toBe(
			"Someone else changed their skills just now. Reload the page and try again."
		);
	});

	it("puts a refusal of the edited entry on its field", () => {
		expect(
			skillsRefusal(
				problem(400, "MEMBER_SKILL_EXPIRY_REQUIRED", ["skills[1].expiresOn"]),
				t,
				1
			).fields
		).toEqual({ expiresOn: "Enter the last day it is valid." });
		expect(
			skillsRefusal(
				problem(400, "MEMBER_SKILL_INACTIVE", ["skills[2].name"]),
				t,
				2
			).fields
		).toEqual({
			name: "This skill is inactive and can’t be given to anyone new.",
		});
	});

	it("says another entry was refused when the code names one they already had", () => {
		expect(
			skillsRefusal(
				problem(400, "MEMBER_SKILL_EXPIRY_REQUIRED", ["skills[0].expiresOn"]),
				t,
				2
			)
		).toMatchObject({
			fields: {},
			message:
				"One of their saved skills was refused. Reload the page and try again.",
		});
	});

	it("explains a measure that changed in the catalogue", () => {
		expect(
			skillsRefusal(
				problem(400, "MEMBER_SKILL_PROFICIENCY_NOT_ALLOWED", [
					"skills[0].proficiency",
				]),
				t,
				0
			).message
		).toBe("How this skill is measured changed just now. Close and try again.");
	});

	it("words a refusal of authority as permission", () => {
		expect(skillsRefusal(problem(403), t, 0).message).toBe(
			"You no longer have permission to change this person’s skills."
		);
	});
});
