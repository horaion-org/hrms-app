import { describe, expect, it } from "vitest";
import {
	createFlowBodyOf,
	flowSchema,
	initialFlowValues,
	newStep,
	toggledFlowBodyOf,
	updateFlowBodyOf,
	type FlowValues,
} from "@/features/approvals/ApprovalFlowDialog/schema";
import { approvalFlowFixture } from "@/features/approvals/fixtures";
import { authTestI18n } from "@/features/auth/testingI18n";

/*
 * The dialog itself is driven end to end in `ApprovalsSettings.test.tsx`
 * (add, edit, reorder, people, refusals); here are its rules and what it sends.
 */

const t = authTestI18n.t.bind(authTestI18n);
const SITI = {
	membershipId: "m-3",
	displayName: "Siti Rahman",
	status: "ACTIVE" as const,
};

const values = (overrides: Partial<FlowValues> = {}): FlowValues => ({
	departmentId: "",
	name: "Company publishing",
	steps: [{ ...newStep(), label: "Publish" }],
	distinctApprovers: false,
	...overrides,
});

const issues = (input: FlowValues): Array<string> => {
	const result = flowSchema(t).safeParse(input);
	return result.success
		? []
		: result.error.issues.map((issue) => issue.message);
};

describe("ApprovalFlowDialog rules", () => {
	it("takes one to three named steps", () => {
		const step = { ...newStep(), label: "Step" };
		expect(issues(values())).toEqual([]);
		expect(issues(values({ steps: [] }))).toHaveLength(1);
		expect(issues(values({ steps: [step, step, step] }))).toEqual([]);
		expect(issues(values({ steps: [step, step, step, step] }))).toHaveLength(1);
		expect(issues(values({ steps: [newStep()] }))).toEqual(["Name this step."]);
		expect(issues(values({ name: " " }))).toEqual(["Enter a name."]);
	});

	it("needs people where only named people decide, any or all of them", () => {
		const onlyThese = {
			...newStep(),
			label: "Endorse",
			rule: "MEMBERS" as const,
		};
		expect(issues(values({ steps: [onlyThese] }))).toEqual([
			"Choose at least one person.",
		]);
		expect(
			issues(values({ steps: [{ ...onlyThese, quorum: "ALL" }] }))
		).toEqual(["Choose at least one person."]);
		expect(
			issues(
				values({ steps: [{ ...onlyThese, quorum: "ALL", members: [SITI] }] })
			)
		).toEqual([]);
	});
});

describe("ApprovalFlowDialog bodies", () => {
	it("sends an anyone step as any one of nobody named, whatever was picked before", () => {
		const body = createFlowBodyOf(
			values({
				departmentId: "d-1",
				steps: [
					{
						label: " Publish ",
						rule: "KEY_HOLDERS",
						quorum: "ALL",
						members: [SITI],
					},
				],
			}),
			"SCHEDULE_PUBLICATION"
		);
		expect(body).toEqual({
			subjectType: "SCHEDULE_PUBLICATION",
			departmentId: "d-1",
			name: "Company publishing",
			steps: [
				{ label: "Publish", rule: "KEY_HOLDERS", quorum: "ANY", memberIds: [] },
			],
			distinctApprovers: false,
		});
		expect(
			createFlowBodyOf(values(), "SCHEDULE_PUBLICATION").departmentId
		).toBeNull();
	});

	it("sends the subject the dialog was opened for", () => {
		expect(createFlowBodyOf(values(), "LEAVE_REQUEST").subjectType).toBe(
			"LEAVE_REQUEST"
		);
	});

	it("sends a different person per step only with two steps or more", () => {
		const step = { ...newStep(), label: "Step" };
		expect(
			createFlowBodyOf(values({ distinctApprovers: true }), "LEAVE_REQUEST")
				.distinctApprovers
		).toBe(false);
		expect(
			updateFlowBodyOf(
				values({ distinctApprovers: true, steps: [step, step] }),
				true
			).distinctApprovers
		).toBe(true);
		expect(
			toggledFlowBodyOf(approvalFlowFixture({ distinctApprovers: true }))
				.distinctApprovers
		).toBe(true);
	});

	it("starts an edit from the flow, keeps whether it is on, and toggles only that", () => {
		const flow = approvalFlowFixture();
		const start = initialFlowValues(flow, {
			formerMember: "Former",
			newName: "",
		});
		expect(start.departmentId).toBe("d-1");
		expect(start.steps[0]?.members.map((member) => member.displayName)).toEqual(
			["Ahmad Ali", "Siti Rahman"]
		);
		expect(updateFlowBodyOf(start, false).active).toBe(false);
		expect(toggledFlowBodyOf(flow)).toMatchObject({
			active: false,
			name: flow.name,
		});
		expect(
			initialFlowValues(undefined, { formerMember: "Former", newName: "New" })
		).toEqual({
			departmentId: "",
			name: "New",
			steps: [newStep()],
			distinctApprovers: false,
		});
	});
});
