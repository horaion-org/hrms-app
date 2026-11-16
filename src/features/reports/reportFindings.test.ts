import { describe, expect, it } from "vitest";
import {
	overtimeFixture,
	staffingRuleFixture,
} from "@/features/dashboard/fixtures";
import { rosterChangeDepartmentFixture } from "@/features/reports/fixtures";
import {
	overtimeFinding,
	stabilityFinding,
	staffingFinding,
} from "@/features/reports/reportFindings";

describe("staffingFinding", () => {
	it("names the one rule behind most of the worst branch's shortfall", () => {
		const finding = staffingFinding([
			staffingRuleFixture({
				branchName: "North Point",
				ruleName: "Duty Manager Day",
				gapsInRange: 36,
			}),
			staffingRuleFixture({
				branchName: "North Point",
				ruleName: "Night guard",
				gapsInRange: 16,
			}),
			staffingRuleFixture({ branchName: "Central Plaza", gapsInRange: 3 }),
		]);

		expect(finding).toEqual({
			key: "oneRule",
			values: {
				branch: "North Point",
				total: 52,
				rule: "Duty Manager Day",
				count: 36,
			},
		});
	});

	it("names only the branch when no rule holds half of its shortfall", () => {
		const finding = staffingFinding([
			staffingRuleFixture({ ruleName: "A", gapsInRange: 4 }),
			staffingRuleFixture({ ruleName: "B", gapsInRange: 3 }),
			staffingRuleFixture({ ruleName: "C", gapsInRange: 3 }),
		]);

		expect(finding).toEqual({
			key: "branch",
			values: { branch: "Main branch", total: 10 },
		});
	});

	it("says nothing ran short when no rule has gaps, or there are no rules", () => {
		expect(staffingFinding([staffingRuleFixture({ gapsInRange: 0 })])).toEqual({
			key: "noGaps",
		});
		expect(staffingFinding([])).toEqual({ key: "noGaps" });
	});
});

describe("overtimeFinding", () => {
	it("counts the people over the limit, each once", () => {
		const departments = overtimeFixture().departments;
		const sameMemberNextMonth = { ...departments[0]!, month: "2026-12" };

		expect(overtimeFinding([...departments, sameMemberNextMonth])).toEqual({
			key: "overLimit",
			values: { count: 1 },
		});
	});

	it("falls back to the people near the limit, then to where most was rostered", () => {
		const row = overtimeFixture().departments[0]!;
		const near = {
			...row,
			members: [{ ...row.members[0]!, standing: "NEAR" as const }],
		};

		expect(overtimeFinding([near])).toEqual({
			key: "nearLimit",
			values: { count: 1 },
		});
		expect(overtimeFinding([{ ...row, members: [] }])).toEqual({
			key: "withinLimit",
			values: { department: "Sales" },
		});
	});

	it("says none was rostered when the rows hold no overtime", () => {
		const row = overtimeFixture().departments[0]!;

		expect(
			overtimeFinding([{ ...row, overtimeMinutes: 0, members: [] }])
		).toEqual({ key: "none" });
		expect(overtimeFinding([])).toEqual({ key: "none" });
	});
});

describe("stabilityFinding", () => {
	it("counts the changes and names the reason behind most", () => {
		expect(stabilityFinding([rosterChangeDepartmentFixture()])).toEqual({
			key: "mostly",
			values: { count: 4, reason: "MANUAL" },
		});
	});

	it("says nothing changed when no published roster changed", () => {
		expect(
			stabilityFinding([
				rosterChangeDepartmentFixture({ totalChanges: 0, reasons: [] }),
			])
		).toEqual({ key: "none" });
	});
});
