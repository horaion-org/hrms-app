import { describe, expect, it } from "vitest";
import {
	fallbackLineOf,
	flowsOfSubject,
	subjectCopyKey,
	subjectOfSlug,
} from "@/features/approvals/approvalSubjects";
import {
	approvalFlowFixture,
	companyFlowFixture,
	leaveFlowFixture,
} from "@/features/approvals/fixtures";

describe("fallbackLineOf", () => {
	it("says nothing is set up when the subject has no flow", () => {
		expect(fallbackLineOf([])).toBe("none");
	});

	it("says the rest decide in one step when only departments have flows", () => {
		expect(fallbackLineOf([approvalFlowFixture()])).toBe("oneStep");
	});

	it("says the rest decide in one step when the company default is off", () => {
		expect(fallbackLineOf([{ ...companyFlowFixture(), active: false }])).toBe(
			"oneStep"
		);
	});

	it("says every department uses the company default when it is on and no department has its own", () => {
		expect(fallbackLineOf([companyFlowFixture()])).toBe("everyDepartment");
	});

	it("says the rest use the company default when it is on beside department flows", () => {
		expect(fallbackLineOf([companyFlowFixture(), approvalFlowFixture()])).toBe(
			"companyDefault"
		);
	});
});

describe("flowsOfSubject", () => {
	it("keeps one subject's flows in the API's order and leaves the others out", () => {
		const flows = [
			companyFlowFixture(),
			leaveFlowFixture(),
			approvalFlowFixture(),
			{
				...approvalFlowFixture(),
				approvalFlowId: "af-x",
				subjectType: "OVERTIME",
			},
		];
		expect(
			flowsOfSubject(flows, "SCHEDULE_PUBLICATION").map(
				(flow) => flow.approvalFlowId
			)
		).toEqual(["af-0", "af-1"]);
		expect(
			flowsOfSubject(flows, "LEAVE_REQUEST").map((flow) => flow.approvalFlowId)
		).toEqual(["af-9"]);
	});
});

describe("subject names", () => {
	it("maps each subject to its short name and back", () => {
		expect(subjectCopyKey("LEAVE_REQUEST")).toBe(
			"approvals.flows.subjects.leave"
		);
		expect(subjectOfSlug("roster")).toBe("SCHEDULE_PUBLICATION");
		expect(subjectOfSlug("leave")).toBe("LEAVE_REQUEST");
		expect(subjectOfSlug("overtime")).toBeUndefined();
	});
});
