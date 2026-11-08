import type { TFunction } from "i18next";
import { z } from "zod";
import {
	APPROVAL_FLOW_MAX_STEPS,
	APPROVAL_FLOW_NAME_MAX_LENGTH,
	APPROVAL_STEP_LABEL_INPUT_MAX_LENGTH,
	APPROVAL_STEP_MAX_MEMBERS,
	SCHEDULE_PUBLICATION,
	type ApprovalFlow,
	type ApprovalFlowStepBody,
	type ApprovalQuorum,
	type ApprovalStepRule,
	type CreateApprovalFlowBody,
	type UpdateApprovalFlowBody,
} from "@/features/approvals/api";
import type { CompanyMember } from "@/features/organisation/api";

const key = "approvals.flows.dialog";

/** One step as the dialog holds it: named people as the people picker's members. */
export type FlowStepValues = {
	label: string;
	rule: ApprovalStepRule;
	quorum: ApprovalQuorum;
	members: Array<CompanyMember>;
};

/** The dialog's values; `departmentId` is empty for the whole company. */
export type FlowValues = {
	departmentId: string;
	name: string;
	steps: Array<FlowStepValues>;
};

/** A new step: anyone who can publish, any one of them. */
export const newStep = (): FlowStepValues => ({
	label: "",
	rule: "KEY_HOLDERS",
	quorum: "ANY",
	members: [],
});

/**
 * The API's rules for a flow, plus the app's own: at most 3 steps, and "all
 * of them" only with named people. Whether the unit already has a flow, and
 * whether a step has anyone eligible, stay the API's decision.
 */
export const flowSchema = (t: TFunction): z.ZodType<FlowValues, FlowValues> =>
	z.object({
		departmentId: z.string(),
		name: z
			.string()
			.trim()
			.min(1, t(`${key}.nameRequired`))
			.max(APPROVAL_FLOW_NAME_MAX_LENGTH, t(`${key}.nameTooLong`)),
		steps: z
			.array(
				z
					.object({
						label: z
							.string()
							.trim()
							.min(1, t(`${key}.labelRequired`))
							.max(
								APPROVAL_STEP_LABEL_INPUT_MAX_LENGTH,
								t(`${key}.labelTooLong`)
							),
						rule: z.enum(["KEY_HOLDERS", "MEMBERS"]),
						quorum: z.enum(["ANY", "ALL"]),
						members: z.array(
							z.object({
								membershipId: z.string(),
								displayName: z.string(),
								status: z.enum(["ACTIVE", "INACTIVE"]),
							})
						),
					})
					.superRefine((step, context) => {
						if (step.rule === "MEMBERS" && step.members.length === 0)
							context.addIssue({
								code: "custom",
								path: ["members"],
								message: t(`${key}.peopleRequired`),
							});
					})
			)
			.min(1)
			.max(APPROVAL_FLOW_MAX_STEPS),
	});

/** Where the dialog starts: the flow being edited, or one step for the whole company named `newName`. */
export const initialFlowValues = (
	editing: ApprovalFlow | undefined,
	{ formerMember, newName }: { formerMember: string; newName: string }
): FlowValues =>
	editing
		? {
				departmentId: editing.departmentId ?? "",
				name: editing.name,
				steps: editing.steps.map((step) => ({
					label: step.label,
					// A rule or quorum newer than this app is offered as the safest known one.
					rule: step.rule === "MEMBERS" ? "MEMBERS" : "KEY_HOLDERS",
					quorum:
						step.rule === "MEMBERS" && step.quorum === "ALL" ? "ALL" : "ANY",
					members: step.members.map((member) => ({
						membershipId: member.membershipId,
						displayName: member.displayName ?? formerMember,
						status: "ACTIVE",
					})),
				})),
			}
		: { departmentId: "", name: newName, steps: [newStep()] };

/** One step as the API takes it; a "anyone who can publish" step names nobody and needs any one of them. */
const stepBodyOf = (step: FlowStepValues): ApprovalFlowStepBody =>
	step.rule === "MEMBERS"
		? {
				label: step.label.trim(),
				rule: "MEMBERS",
				quorum: step.quorum,
				memberIds: step.members
					.slice(0, APPROVAL_STEP_MAX_MEMBERS)
					.map((member) => member.membershipId),
			}
		: {
				label: step.label.trim(),
				rule: "KEY_HOLDERS",
				quorum: "ANY",
				memberIds: [],
			};

/** What adding the flow sends. */
export const createFlowBodyOf = (
	values: FlowValues
): CreateApprovalFlowBody => ({
	subjectType: SCHEDULE_PUBLICATION,
	departmentId: values.departmentId === "" ? null : values.departmentId,
	name: values.name.trim(),
	steps: values.steps.map(stepBodyOf),
});

/** What replacing the flow sends; whether it is on is kept as it is. */
export const updateFlowBodyOf = (
	values: FlowValues,
	active: boolean
): UpdateApprovalFlowBody => ({
	name: values.name.trim(),
	active,
	steps: values.steps.map(stepBodyOf),
});

/** A flow sent back whole with only `active` changed, for turning it on or off from its row. */
export const toggledFlowBodyOf = (
	flow: ApprovalFlow
): UpdateApprovalFlowBody => ({
	name: flow.name,
	active: !flow.active,
	steps: flow.steps.map((step) => ({
		label: step.label,
		rule: step.rule === "MEMBERS" ? "MEMBERS" : "KEY_HOLDERS",
		quorum: step.rule === "MEMBERS" && step.quorum === "ALL" ? "ALL" : "ANY",
		memberIds: step.members.map((member) => member.membershipId),
	})),
});
