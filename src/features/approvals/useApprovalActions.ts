import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	approvalKeys,
	createApprovalFlow,
	decideApproval,
	deleteApprovalFlow,
	updateApprovalFlow,
	withdrawMyApproval,
	type ApprovalFlow,
	type ApprovalInstance,
	type CreateApprovalFlowBody,
	type UpdateApprovalFlowBody,
} from "@/features/approvals/api";

type Replaced = { flowId: string; body: UpdateApprovalFlowBody };

export type ApprovalFlowActions = {
	create: UseMutationResult<ApprovalFlow, Error, CreateApprovalFlowBody>;
	update: UseMutationResult<ApprovalFlow, Error, Replaced>;
	/** Turning a flow on or off: an update with its own success line. */
	toggle: UseMutationResult<ApprovalFlow, Error, Replaced>;
	remove: UseMutationResult<void, Error, string>;
};

/**
 * Adding, replacing, turning on or off and deleting the company's approval
 * flows. Each write reloads every approvals query of the company once it
 * settles, a refusal too: it usually means the list on screen is out of date.
 */
export const useApprovalFlowActions = (
	companyId: string
): ApprovalFlowActions => {
	const client = useQueryClient();
	const reload = (): Promise<void> =>
		client.invalidateQueries({ queryKey: approvalKeys.all(companyId) });
	return {
		create: useMutation({
			meta: { successMessage: "approvals.flows.added" },
			mutationFn: (body: CreateApprovalFlowBody) =>
				createApprovalFlow(companyId, body),
			onSettled: reload,
		}),
		update: useMutation({
			meta: { successMessage: "approvals.flows.saved" },
			mutationFn: ({ flowId, body }: Replaced) =>
				updateApprovalFlow(companyId, flowId, body),
			onSettled: reload,
		}),
		toggle: useMutation({
			meta: { successMessage: "approvals.flows.toggled" },
			mutationFn: ({ flowId, body }: Replaced) =>
				updateApprovalFlow(companyId, flowId, body),
			onSettled: reload,
		}),
		remove: useMutation({
			meta: { successMessage: "approvals.flows.deleted" },
			mutationFn: (flowId: string) => deleteApprovalFlow(companyId, flowId),
			onSettled: reload,
		}),
	};
};

type Decided = { instanceId: string; stepOrder: number; comment: string };

export type ApprovalDecisionActions = {
	approve: UseMutationResult<ApprovalInstance, Error, Decided>;
	reject: UseMutationResult<ApprovalInstance, Error, Decided>;
	withdraw: UseMutationResult<ApprovalInstance, Error, string>;
};

/**
 * Deciding a submission's open step, and the submitter withdrawing it. They
 * show no toast: the page announces the outcome once, in its status region,
 * and moves focus to the approval line (UI research addendum C5). The
 * subject changes with them (the last approval publishes a roster, a
 * rejection rejects it), so `reloadSubject` runs after each, beside the
 * approvals queries; a refusal reloads too, since someone else most likely
 * decided first.
 */
export const useApprovalDecisionActions = (
	companyId: string,
	reloadSubject: () => Promise<unknown>
): ApprovalDecisionActions => {
	const client = useQueryClient();
	const reload = (): Promise<unknown> =>
		Promise.all([
			client.invalidateQueries({ queryKey: approvalKeys.all(companyId) }),
			// A decided step leaves the approvers' Needs review list (addendum C6).
			client.invalidateQueries({ queryKey: ["notifications", companyId] }),
			reloadSubject(),
		]);
	const decide =
		(decision: "APPROVE" | "REJECT") =>
		({ instanceId, stepOrder, comment }: Decided): Promise<ApprovalInstance> =>
			decideApproval(companyId, instanceId, {
				stepOrder,
				decision,
				comment: comment.trim() === "" ? null : comment.trim(),
			});
	return {
		approve: useMutation({
			meta: { successMessage: false },
			mutationFn: decide("APPROVE"),
			onSettled: reload,
		}),
		reject: useMutation({
			meta: { successMessage: false },
			mutationFn: decide("REJECT"),
			onSettled: reload,
		}),
		withdraw: useMutation({
			meta: { successMessage: false },
			mutationFn: (instanceId: string) =>
				withdrawMyApproval(companyId, instanceId),
			onSettled: reload,
		}),
	};
};
