import { describe, expect, it } from "vitest";
import {
	findingFamily,
	findingTone,
	messageFindings,
	strongestTone,
	type Finding,
} from "@/features/scheduling/roster/findings/finding";
import { findingsOfEveryKindFixture } from "@/features/scheduling/schedules/fixtures";

const findings = findingsOfEveryKindFixture();
const diagnostic = (severity: string): Finding => ({
	kind: "diagnostic",
	diagnostic: { ...findings.diagnostics[0]!, severity },
});
const conflict: Finding = {
	kind: "conflict",
	conflict: findings.conflicts[0]!,
};
const message: Finding = { kind: "message", date: null, message: "Short." };

describe("findingFamily", () => {
	it("given_aDiagnostic_when_classed_then_isASetupIssue", () => {
		expect(findingFamily(diagnostic("warning"))).toBe("setup");
	});

	it.each([
		["conflict", conflict],
		["message", message],
	])("given_a_%s_when_classed_then_isARosterNote", (_, finding) => {
		expect(findingFamily(finding)).toBe("roster");
	});
});

describe("findingTone", () => {
	it.each([
		["warning", "warning"],
		["error", "error"],
		["CRITICAL", "error"],
		["info", "info"],
		["something-new", "warning"],
	])(
		"given_aDiagnosticOfSeverity_%s_when_toned_then_reads_%s",
		(severity, tone) => {
			expect(findingTone(diagnostic(severity))).toBe(tone);
		}
	);

	it("given_aRosterNote_when_toned_then_readsAsAnError", () => {
		expect(findingTone(conflict)).toBe("error");
		expect(findingTone(message)).toBe("error");
	});
});

describe("strongestTone", () => {
	it("given_mixedFindings_when_compared_then_isTheMostSerious", () => {
		expect(strongestTone([diagnostic("info"), diagnostic("warning")])).toBe(
			"warning"
		);
		expect(strongestTone([diagnostic("warning"), message])).toBe("error");
	});

	it("given_noFindings_when_compared_then_isInfo", () => {
		expect(strongestTone([])).toBe("info");
	});
});

describe("messageFindings", () => {
	it("given_messages_when_split_then_oneFindingEachWithTheDay", () => {
		expect(messageFindings("2026-10-17", ["One.", "Two."])).toEqual([
			{ kind: "message", date: "2026-10-17", message: "One." },
			{ kind: "message", date: "2026-10-17", message: "Two." },
		]);
	});
});
