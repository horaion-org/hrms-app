import type { ParseKeys } from "i18next";
import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	applyChangeRefusal,
	isHeldRefusal,
	memberTermsRefusal,
	termsRowRefusal,
	termsSaveRefusal,
} from "@/features/employmentTerms/refusals";

const t = authTestI18n.t.bind(authTestI18n);

/** The app's own copy for `key`; fails when the key is missing, so a table cannot point at nothing. */
const copy = (key: ParseKeys, options?: Record<string, unknown>): string => {
	expect(authTestI18n.exists(key, options), key).toBe(true);
	return t(key, { ...options });
};

const problem = (
	status: number,
	errorCode?: string,
	fields: Array<string> = [],
	body?: unknown
): ApiProblemError =>
	new ApiProblemError({
		message: "API says no",
		status,
		errorCode,
		fieldErrors: fields.map((field) => ({ field, message: "API says no" })),
		reason: "http",
		body,
	});

describe("termsSaveRefusal", () => {
	it("puts a taken name on the name field, naming it", () => {
		expect(
			termsSaveRefusal(
				problem(409, "EMPLOYMENT_TERMS_NAME_TAKEN"),
				" Full time ",
				t
			).fields
		).toEqual({
			name: copy("employmentTerms.dialog.nameTaken", { name: "Full time" }),
		});
	});

	it.each([
		["409 EMPLOYMENT_TERMS_HELD", "employmentTerms.dialog.held"],
		[
			"400 EMPLOYMENT_TERMS_START_NOT_MONDAY",
			"employmentTerms.apply.notMonday",
		],
		["404 EMPLOYMENT_TERMS_NOT_FOUND", "employmentTerms.dialog.gone"],
		["403 SOMETHING", "employmentTerms.dialog.forbidden"],
		["500 SOMETHING", "employmentTerms.dialog.failed"],
	] as const)("answers %s with %s", (code, key) => {
		const [status, errorCode] = code.split(" ");
		expect(
			termsSaveRefusal(problem(Number(status), errorCode), "Full time", t)
				.message
		).toBe(copy(key));
	});

	it("counts the people whose own hours stand above corrected terms", () => {
		const refusal = termsSaveRefusal(
			problem(409, "CONTRACTED_HOURS_ABOVE_CORRECTED_TERMS", [], {
				memberCount: 3,
			}),
			"Full time",
			t
		);
		expect(refusal.message).toBe(
			copy("employmentTerms.apply.ownHoursAbove", { count: 3 })
		);
	});

	it.each([
		["name", "name", "employmentTerms.dialog.rejected"],
		["description", "description", "employmentTerms.dialog.descriptionLength"],
		["daysPerWeek", "daysPerWeek", "employmentTerms.dialog.daysInvalid"],
		["dayMinutes", "dayHours", "employmentTerms.dialog.dayRejected"],
		["weekMinutes", "weekHours", "employmentTerms.dialog.weekRejected"],
		["mostWeekMinutes", "mostWeekHours", "employmentTerms.dialog.mostRejected"],
		["restDay", "restWeekday", "employmentTerms.dialog.restDayRequired"],
		["dailyOvertime", "dayHours", "employmentTerms.dialog.dailyNeedsDay"],
		["shiftWork", "dayHours", "employmentTerms.dialog.shiftNoDaily"],
	] as const)("places the API's %s rule on %s", (apiField, field, key) => {
		expect(
			termsSaveRefusal(problem(400, undefined, [apiField]), "Full time", t)
				.fields
		).toEqual({ [field]: copy(key) });
	});
});

describe("isHeldRefusal", () => {
	it("is only the 409 for terms people hold", () => {
		expect(isHeldRefusal(problem(409, "EMPLOYMENT_TERMS_HELD"))).toBe(true);
		expect(isHeldRefusal(problem(409, "EMPLOYMENT_TERMS_INACTIVE"))).toBe(
			false
		);
		expect(isHeldRefusal(new Error("offline"))).toBe(false);
	});
});

describe("applyChangeRefusal", () => {
	it.each([
		[
			problem(400, "EMPLOYMENT_TERMS_START_NOT_MONDAY"),
			"employmentTerms.apply.notMonday",
		],
		[problem(404, "EMPLOYMENT_TERMS_NOT_FOUND"), "employmentTerms.dialog.gone"],
		[problem(400, undefined, ["startsOn"]), "employmentTerms.apply.notMonday"],
		[
			problem(400, undefined, ["previousTermsName"]),
			"employmentTerms.apply.successorRejected",
		],
		[
			problem(400, undefined, ["newTerms.name"]),
			"employmentTerms.apply.successorRejected",
		],
		[problem(403, "SOMETHING"), "employmentTerms.dialog.forbidden"],
		[new Error("offline"), "employmentTerms.dialog.failed"],
	] as const)("answers in one sentence: %#", (error, key) => {
		expect(applyChangeRefusal(error, "Part time", t)).toBe(copy(key));
	});

	it("names the successor terms when their name is taken", () => {
		expect(
			applyChangeRefusal(
				problem(409, "EMPLOYMENT_TERMS_NAME_TAKEN"),
				" Part time ",
				t
			)
		).toBe(copy("employmentTerms.dialog.nameTaken", { name: "Part time" }));
	});
});

describe("termsRowRefusal", () => {
	it.each([
		["404 EMPLOYMENT_TERMS_NOT_FOUND", "gone"],
		["409 DEFAULT_EMPLOYMENT_TERMS", "isDefault"],
		["409 EMPLOYMENT_TERMS_HELD", "held"],
		["409 EMPLOYMENT_TERMS_INACTIVE", "inactive"],
		["403 SOMETHING", "forbidden"],
		["500 SOMETHING", "failed"],
	] as const)("answers %s with panel.refusal.%s", (code, name) => {
		const [status, errorCode] = code.split(" ");
		expect(termsRowRefusal(problem(Number(status), errorCode), t)).toBe(
			copy(`employmentTerms.panel.refusal.${name}`)
		);
	});
});

describe("memberTermsRefusal", () => {
	it.each([
		["400 EMPLOYMENT_TERMS_START_NOT_MONDAY", "effectiveFrom", "notMonday"],
		["400 EMPLOYMENT_TERMS_BEFORE_FIRST_ENTRY", "effectiveFrom", "beforeFirst"],
		["409 EMPLOYMENT_TERMS_CHANGE_EXISTS", "effectiveFrom", "exists"],
		["400 CONTRACTED_HOURS_ABOVE_TERMS", "ownWeek", "aboveTerms"],
		["409 EMPLOYMENT_TERMS_INACTIVE", "termsId", "inactive"],
	] as const)("puts %s on %s", (code, field, name) => {
		const [status, errorCode] = code.split(" ");
		expect(
			memberTermsRefusal(problem(Number(status), errorCode), t).fields
		).toEqual({ [field]: copy(`employmentTerms.change.${name}`) });
	});

	it.each([
		["404 MEMBER_EMPLOYMENT_TERMS_NOT_FOUND", "employmentTerms.change.gone"],
		["404 EMPLOYMENT_TERMS_NOT_FOUND", "employmentTerms.change.inactive"],
		["409 EMPLOYMENT_TERMS_CHANGE_STARTED", "employmentTerms.history.started"],
		["403 SOMETHING", "employmentTerms.change.forbidden"],
		["500 SOMETHING", "employmentTerms.change.failed"],
	] as const)("answers %s with %s", (code, key) => {
		const [status, errorCode] = code.split(" ");
		expect(
			memberTermsRefusal(problem(Number(status), errorCode), t).message
		).toBe(copy(key));
	});

	it.each([
		["dayWithinWeek", "ownDay", "ownDayAboveWeek"],
		["contractedWeekMinutes", "ownWeek", "aboveTerms"],
		["contractedDayMinutes", "ownDay", "aboveTerms"],
		["effectiveFrom", "effectiveFrom", "fromRequired"],
	] as const)("places the API's %s rule on %s", (apiField, field, name) => {
		expect(
			memberTermsRefusal(problem(400, undefined, [apiField]), t).fields
		).toEqual({ [field]: copy(`employmentTerms.change.${name}`) });
	});
});
