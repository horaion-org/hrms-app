// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	compare,
	isRefusalModule,
	spellsLooseCodes,
} from "./check-loose-codes.mjs";

const FEATURE_FILE = "src/features/people/notes.ts";

describe("isRefusalModule", () => {
	it.each([
		"src/features/shifts/shiftRefusal.ts",
		"src/features/employmentTerms/refusals.ts",
		"src/features/skills/SkillSettingsDialog/refusalFor.ts",
		"src/common/problem.ts",
		"src/common/api-client.ts",
		"src/common/refusal.ts",
	])("counts %s as a refusal module", (path) => {
		expect(isRefusalModule(path)).toBe(true);
	});

	it("does not count an api module", () => {
		expect(isRefusalModule("src/features/people/api.ts")).toBe(false);
	});
});

describe("spellsLooseCodes", () => {
	it.each([
		['error.errorCode === "MEMBER_NOTE_NOT_FOUND"', "a code compared by hand"],
		["cause.errorCode !== 'SESSION_EXPIRED'", "a code compared with !=="],
		["REFUSALS[error.errorCode]", "a table looked up by code"],
		['{ "404 SKILL_NOT_FOUND": t("gone") }', "a status and code key"],
	])("finds %s (%s)", (source) => {
		expect(spellsLooseCodes(FEATURE_FILE, source)).toBe(true);
	});

	it("passes code that reads named codes", () => {
		expect(
			spellsLooseCodes(FEATURE_FILE, "error.errorCode === NOTE_ERROR.missing")
		).toBe(false);
	});

	it("passes a status and code written in a comment's backticks", () => {
		expect(
			spellsLooseCodes(FEATURE_FILE, "// refused with `409 EMPLOYMENT_TERMS_HELD`")
		).toBe(false);
	});

	it("passes a refusal module, a test and a story", () => {
		const source = '"404 SKILL_NOT_FOUND"';

		expect(spellsLooseCodes("src/features/a/aRefusal.ts", source)).toBe(false);
		expect(spellsLooseCodes("src/features/a/a.test.ts", source)).toBe(false);
		expect(spellsLooseCodes("src/features/a/A.stories.tsx", source)).toBe(
			false
		);
	});
});

describe("compare", () => {
	it("passes when the files found are the files listed", () => {
		expect(compare([FEATURE_FILE], [FEATURE_FILE])).toEqual([]);
	});

	it("names a new file and what to do", () => {
		expect(compare([FEATURE_FILE], [])).toEqual([
			"src/features/people/notes.ts spells a refusal code by hand: name the code once in the feature's <area>Refusal.ts (through mapRefusal in src/common/refusal.ts) and import what it gives",
		]);
	});

	it("says which line to delete when a listed file no longer spells codes", () => {
		expect(compare([], [FEATURE_FILE])).toEqual([
			"no longer spells a refusal code, delete it from ALLOWED_LOOSE_CODES: src/features/people/notes.ts",
		]);
	});
});
