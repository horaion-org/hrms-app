import { describe, expect, it, vi } from "vitest";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import type { RosterValidation } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";
import { issueCoverOf } from "./issueCoverOf";

/** The cover context of a roster at revision 1 whose rules check stands as `validation` says. */
const coverWith = (
	validation: RosterValidation
): ReturnType<typeof issueCoverOf> =>
	issueCoverOf({
		editing: {
			target: {
				companyId: "c-1",
				unit: { branchId: "b-1", departmentId: "d-1" },
				scheduleId: "s-1",
				runId: "r-1",
			},
			revision: 1,
			shifts: [],
			nonWorkingDayTypes: [],
			notifiesMembers: false,
		},
		timeZone: "Asia/Singapore",
		assignments: scheduleAssignmentsFixture(),
		validation,
		view: { week: "2026-10-12", panel: "issues" },
		onViewChange: vi.fn(),
		onPreviewDays: vi.fn(),
		onLanded: vi.fn(),
	});

describe("issueCoverOf", () => {
	it("asks the rules check again when the row's options come back while it stands refused, and not otherwise", () => {
		const ask = vi.fn();
		const refused: RosterValidation = {
			status: "refused",
			refusal: "failed",
			ask,
			askAt: vi.fn(),
			revision: 1,
		};
		coverWith(refused).onOptionsBack?.();
		expect(ask).toHaveBeenCalledOnce();

		const idleAsk = vi.fn();
		coverWith({
			status: "idle",
			ask: idleAsk,
			askAt: vi.fn(),
			revision: 1,
		}).onOptionsBack?.();
		expect(idleAsk).not.toHaveBeenCalled();
	});

	it("makes the hours-based list wait while the check is under way", () => {
		const under = { ask: vi.fn(), askAt: vi.fn(), revision: 1 };
		expect(coverWith({ status: "loading", ...under }).listWaitsForCheck).toBe(
			true
		);
		expect(coverWith({ status: "idle", ...under }).listWaitsForCheck).toBe(
			false
		);
	});
});
