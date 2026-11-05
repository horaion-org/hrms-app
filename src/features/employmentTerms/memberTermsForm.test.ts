import { describe, expect, it } from "vitest";
import { MEMBER_TERMS } from "@/features/employmentTerms/fixtures";
import {
	allowedStart,
	startRuleOf,
} from "@/features/employmentTerms/memberTermsForm";

// Newest first: a change on Mon 4 Jan 2027, and the first entry on Sat 1 Mar 2025.
const [change, first] = MEMBER_TERMS.history;

describe("startRuleOf and allowedStart", () => {
	it("lets someone's first terms start on any day", () => {
		const rule = startRuleOf([]);
		expect(allowedStart(rule, "2026-11-05")).toBe(true);
	});

	it("starts a change on a Monday after the first entry", () => {
		const rule = startRuleOf(MEMBER_TERMS.history);
		expect(rule).toEqual({ kind: "monday", after: "2025-03-01" });
		expect(allowedStart(rule, "2026-11-09")).toBe(true);
		expect(allowedStart(rule, "2026-11-10")).toBe(false);
		// A Monday before the first entry is refused, as the API refuses it.
		expect(allowedStart(rule, "2025-02-24")).toBe(false);
	});

	it("lets the first entry move to any day while it stays first", () => {
		const rule = startRuleOf(MEMBER_TERMS.history, first);
		expect(rule).toEqual({ kind: "first", before: "2027-01-04" });
		expect(allowedStart(rule, "2025-03-05")).toBe(true);
		expect(allowedStart(rule, "2027-01-04")).toBe(false);
		expect(allowedStart(startRuleOf([first!], first), "2026-11-05")).toBe(true);
	});

	it("lets a later entry keep its own day, or move to another Monday", () => {
		const rule = startRuleOf(MEMBER_TERMS.history, change);
		expect(allowedStart(rule, "2027-01-04")).toBe(true);
		expect(allowedStart(rule, "2027-01-11")).toBe(true);
		expect(allowedStart(rule, "2027-01-12")).toBe(false);
	});
});
