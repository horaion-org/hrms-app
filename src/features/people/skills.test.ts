import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	MAX_SKILLS,
	sameSkills,
	skillChoices,
	skillFormSchema,
	skillsRefusal,
	withSkill,
} from "@/features/people/skills";

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
const baking = { name: "Baking", proficiency: 8 };
const safety = { name: "Food safety", proficiency: 7 };

describe("skills", () => {
	it("are the same set in any order and any letter case", () => {
		expect(
			sameSkills([baking, safety], [safety, { ...baking, name: "baking" }])
		).toBe(true);
		expect(sameSkills([baking], [{ ...baking, proficiency: 9 }])).toBe(false);
		expect(sameSkills([baking], [baking, safety])).toBe(false);
	});

	it("take a new skill in name order", () => {
		expect(
			withSkill([baking, safety], { name: "coffee", proficiency: 5 })
		).toEqual([baking, { name: "coffee", proficiency: 5 }, safety]);
	});

	it("offer what was typed as a new name unless the company already uses it", () => {
		const suggestions = [{ skillId: "s-1", name: "Pastry art" }];
		expect(skillChoices(suggestions, " latte ")).toEqual([
			{ name: "latte", isNew: true },
			{ name: "Pastry art", isNew: false },
		]);
		expect(skillChoices(suggestions, "PASTRY ART")).toEqual([
			{ name: "Pastry art", isNew: false },
		]);
		expect(skillChoices(suggestions, "  ")).toEqual([
			{ name: "Pastry art", isNew: false },
		]);
	});
});

describe("skill form", () => {
	const message = (
		taken: Array<string>,
		value: { name: string; proficiency: number }
	): string | undefined =>
		skillFormSchema(t, taken).safeParse(value).error?.issues[0]?.message;

	it("takes a valid new name and a proficiency from 1 to 10", () => {
		expect(
			skillFormSchema(t, ["Baking"]).parse({
				name: " Latte art ",
				proficiency: 10,
			})
		).toEqual({ name: "Latte art", proficiency: 10 });
	});

	it.each([
		[{ name: "", proficiency: 5 }, "Choose or type a skill."],
		[{ name: "A", proficiency: 5 }, "Use 2 to 100 characters."],
		[
			{ name: "C++", proficiency: 5 },
			"Use only letters, numbers, spaces and . ' & - in the name.",
		],
		[{ name: "baking", proficiency: 5 }, "They already have this skill."],
		[{ name: "Latte", proficiency: 0 }, "Choose a proficiency from 1 to 10."],
		[{ name: "Latte", proficiency: 11 }, "Choose a proficiency from 1 to 10."],
	])("refuses %j", (value, text) => {
		expect(message(["Baking"], value)).toBe(text);
	});

	it("refuses another skill once they have the most allowed", () => {
		const full = Array.from(
			{ length: MAX_SKILLS },
			(_, index) => `Skill ${index}`
		);
		expect(message(full, { name: "Latte", proficiency: 5 })).toBe(
			"They already have 50 skills, the most allowed. Remove one first."
		);
	});
});

describe("skill refusals", () => {
	it("places the new skill's own field errors on its fields", () => {
		expect(
			skillsRefusal(
				problem(400, undefined, ["skills[2].name", "skills[2].proficiency"]),
				t,
				2
			).fields
		).toEqual({
			name: "Check the skill’s name and try again.",
			proficiency: "Choose a proficiency from 1 to 10.",
		});
		expect(
			skillsRefusal(problem(400, "DUPLICATE_SKILL_NAME"), t, 2).fields
		).toEqual({
			name: "They already have this skill.",
		});
		expect(
			skillsRefusal(problem(400, "INVALID_SKILL_NAME"), t, 2).fields
		).toEqual({
			name: "Check the skill’s name and try again.",
		});
	});

	it.each([
		[
			problem(400, undefined, ["skills[0].name"]),
			"One of their saved skills was refused. Reload the page and try again.",
		],
		[
			problem(409, "SKILL_NAME_CONFLICT"),
			"Someone else changed their skills just now. Reload the page and try again.",
		],
		[
			problem(409),
			"Someone else changed their skills just now. Reload the page and try again.",
		],
		[
			problem(404, "MEMBER_PROFILE_NOT_FOUND"),
			"This person is no longer available.",
		],
		[
			problem(409, "MEMBER_PROFILE_MOVED"),
			"They were moved to another department while you were working. Reload the page and try again.",
		],
		[
			problem(403, "AUTHORIZATION_DENIED"),
			"You no longer have permission to change this person’s skills.",
		],
		[new Error("offline"), "We couldn’t save the skills. Try again."],
	])("explains %s as the dialog's alert", (error, text) => {
		expect(skillsRefusal(error, t, 2)).toEqual({
			fields: {},
			message: text,
			refreshMembers: false,
		});
	});
});
