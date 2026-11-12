import { describe, expect, it } from "vitest";
import { approvalInstanceFixture } from "@/features/approvals/fixtures";
import { monthSummaryFixture } from "@/features/scheduling/months/fixtures";
import { weekWaitingOnMe } from "@/features/scheduling/months/monthApprovals";

// Kitchen's November: s-1 published 2 Nov, s-2 to review 9 Nov, s-3 and s-4 tentative, 30 Nov without a schedule.
const NOVEMBER = monthSummaryFixture();

describe("weekWaitingOnMe", () => {
	it("given_anApprovalOfOneOfTheMonthsSchedules_when_matched_then_thatWeekWithItsOpenStep", () => {
		expect(
			weekWaitingOnMe(NOVEMBER, [approvalInstanceFixture({ subjectId: "s-2" })])
		).toEqual({
			periodStart: "2026-11-09",
			step: { order: 1, count: 2, label: "Endorse", isLast: false },
		});
	});

	it("given_anApprovalOfAnotherSchedule_when_matched_then_none", () => {
		expect(
			weekWaitingOnMe(NOVEMBER, [approvalInstanceFixture({ subjectId: "s-9" })])
		).toBeUndefined();
	});

	it("given_anotherSubjectTypeWithTheSameId_when_matched_then_none", () => {
		expect(
			weekWaitingOnMe(NOVEMBER, [
				approvalInstanceFixture({
					subjectType: "LEAVE_REQUEST",
					subjectId: "s-2",
				}),
			])
		).toBeUndefined();
	});

	it("given_anInstanceWithNoOpenStep_when_matched_then_none", () => {
		expect(
			weekWaitingOnMe(NOVEMBER, [
				approvalInstanceFixture({ subjectId: "s-2", status: "APPROVED" }),
			])
		).toBeUndefined();
	});

	it("given_noApprovals_when_matched_then_none", () => {
		expect(weekWaitingOnMe(NOVEMBER, [])).toBeUndefined();
	});
});
