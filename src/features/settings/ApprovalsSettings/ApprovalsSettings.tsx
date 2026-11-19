import { useQuery } from "@tanstack/react-query";
import { useId, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { PlusIcon } from "@/components/ui/Icon";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import {
	approvalFlowsQuery,
	type ApprovalFlow,
	type ApprovalSubject,
} from "@/features/approvals/api";
import { ApprovalFlowDialog } from "@/features/approvals/ApprovalFlowDialog";
import {
	createFlowBodyOf,
	toggledFlowBodyOf,
	updateFlowBodyOf,
} from "@/features/approvals/ApprovalFlowDialog/schema";
import { approvalFlowColumns } from "@/features/approvals/approvalFlowColumns";
import { flowChangeRefusal } from "@/features/approvals/approvalRefusal";
import {
	fallbackLineOf,
	flowsOfSubject,
	subjectCopyKey,
} from "@/features/approvals/approvalSubjects";
import { useApprovalFlowActions } from "@/features/approvals/useApprovalActions";
import { workspaceQuery } from "@/features/workspace/api";
import { retry } from "@/features/workspace/retry";
import { departmentChoices } from "@/features/workspace/unitChoices";

export type ApprovalsSettingsProps = {
	companyId: string;
	/** Holds `approval_flow:read` company-wide: the list is read. */
	canRead: boolean;
	/** Holds `approval_flow:manage` company-wide: flows may be added and changed. */
	canManage: boolean;
	/** The subject whose flows are shown: Settings › Roster approvals or Leave approvals. */
	subject: ApprovalSubject;
};

const key = "approvals.flows";

/** A row's change waiting on its confirm: turning it on or off, or deleting it. */
type Change = { kind: "toggle" | "delete"; flow: ApprovalFlow };

/** The flow dialog: adding one, or editing `editing`. */
type FlowDialog = { editing?: ApprovalFlow };

/**
 * Settings › Roster approvals or Leave approvals: who approves one subject.
 * It lists the subject's flows (where each applies, its steps, on or off),
 * the company default first, and ends with a line saying what decides
 * everywhere else; with no flow it is that one sentence. The list needs `approval_flow:read`, and
 * adding, editing, turning on or off and deleting need
 * `approval_flow:manage`, both held company-wide; the page passes whether
 * they are held.
 */
export const ApprovalsSettings = ({
	companyId,
	canRead,
	canManage,
	subject,
}: ApprovalsSettingsProps): FunctionComponent => {
	const { t } = useTranslation();
	const flows = useQuery(approvalFlowsQuery(companyId, canRead));
	const workspace = useQuery({ ...workspaceQuery, retry });
	const actions = useApprovalFlowActions(companyId);
	const [dialog, setDialog] = useState<FlowDialog | null>(null);
	const idPrefix = useId();
	const [change, setChange] = useState<Change | null>(null);
	const departmentNames = useMemo(
		() =>
			new Map(
				(workspace.data
					? departmentChoices(workspace.data, companyId, ["approval_flow:read"])
					: []
				).map((choice) => [choice.departmentId, choice.name])
			),
		[workspace.data, companyId]
	);
	const columns = useMemo(
		() =>
			approvalFlowColumns(
				t,
				(departmentId) => departmentNames.get(departmentId),
				canManage
					? {
							onEdit: (flow: ApprovalFlow): void => {
								setDialog({ editing: flow });
							},
							menu: (flow: ApprovalFlow): ReactNode => (
								<>
									<OverflowMenuItem
										onClick={() => {
											setChange({ kind: "toggle", flow });
										}}
									>
										{t(flow.active ? `${key}.turnOff` : `${key}.turnOn`)}
									</OverflowMenuItem>
									<OverflowMenuItem
										onClick={() => {
											setChange({ kind: "delete", flow });
										}}
									>
										{t(`${key}.delete`)}
									</OverflowMenuItem>
								</>
							),
						}
					: undefined
			),
		[t, departmentNames, canManage]
	);
	const copy = subjectCopyKey(subject);
	const subjectFlows = flowsOfSubject(flows.data ?? [], subject);
	const fallback = fallbackLineOf(subjectFlows);
	const headingId = `${idPrefix}-title`;
	const addId = `${idPrefix}-add`;
	const forbidden =
		!canRead ||
		(flows.error instanceof ApiProblemError && flows.error.status === 403);
	const problem = forbidden
		? t(`${key}.hidden`)
		: flows.isError
			? t(`${key}.failed`)
			: flows.data === undefined
				? t(`${key}.loading`)
				: undefined;
	const changing = change?.kind === "delete" ? actions.remove : actions.toggle;
	const closeChange = (): void => {
		changing.reset();
		setChange(null);
	};

	return (
		<>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="text-xl font-semibold text-neutral-900" id={headingId}>
						{t(`${copy}.pageTitle`)}
					</h2>
					<p className="mt-3 text-sm text-neutral-800">
						{t(`${copy}.pageSubtitle`)}
					</p>
				</div>
				{canManage && !problem && (
					<Button
						// "Add flow" read with its heading: "Add flow Leave approvals".
						aria-labelledby={`${addId} ${headingId}`}
						className="self-start"
						id={addId}
						leadingIcon={<PlusIcon />}
						size="sm"
						onClick={() => {
							setDialog({});
						}}
					>
						{t(`${key}.add`)}
					</Button>
				)}
			</div>
			{problem ? (
				<p
					className="mt-8 text-sm text-neutral-700 data-alert:text-error-700"
					data-alert={flows.isError && !forbidden ? true : undefined}
					role={flows.isError && !forbidden ? "alert" : undefined}
				>
					{problem}
				</p>
			) : (
				<section className="mt-8 flex flex-col gap-3">
					{subjectFlows.length > 0 && (
						<DataTable
							// Fits beside Settings' list, with the steps and status on the name's line.
							className="[&>table]:min-w-0"
							columns={columns}
							data={subjectFlows}
							emptyState=""
							getRowId={(flow) => flow.approvalFlowId}
							label={t(`${copy}.pageTitle`)}
						/>
					)}
					<p className="text-sm text-neutral-700">
						{fallback === "companyDefault"
							? t(`${key}.usesCompanyDefault`)
							: fallback === "everyDepartment"
								? t(`${key}.everyDepartmentUsesDefault`)
								: t(`${copy}.${fallback}`)}
					</p>
				</section>
			)}
			{dialog && (
				<ApprovalFlowDialog
					companyId={companyId}
					departmentName={(departmentId) => departmentNames.get(departmentId)}
					editing={dialog.editing}
					subjectType={subject}
					onClose={() => {
						setDialog(null);
					}}
					onSave={(values) => {
						const editing = dialog.editing;
						return editing
							? actions.update.mutateAsync({
									flowId: editing.approvalFlowId,
									body: updateFlowBodyOf(values, editing.active),
								})
							: actions.create.mutateAsync(
									createFlowBodyOf(values, subject)
								);
					}}
				/>
			)}
			{change && (
				<ConfirmDialog
					cancelLabel={t(`${key}.cancel`)}
					submitting={changing.isPending}
					error={
						changing.error ? flowChangeRefusal(changing.error, t) : undefined
					}
					{...(change.kind === "delete"
						? {
								tone: "danger" as const,
								title: t(`${key}.deleteTitle`, { name: change.flow.name }),
								description: t(
									`${copy}.deleteDescription`
								),
								confirmLabel: t(`${key}.deleteConfirm`),
							}
						: change.flow.active
							? {
									title: t(`${key}.turnOffTitle`, { name: change.flow.name }),
									description: t(
										`${copy}.turnOffDescription`
									),
									confirmLabel: t(`${key}.turnOffConfirm`),
								}
							: {
									title: t(`${key}.turnOnTitle`, { name: change.flow.name }),
									description: t(
										`${copy}.turnOnDescription`
									),
									confirmLabel: t(`${key}.turnOnConfirm`),
								})}
					onClose={closeChange}
					onConfirm={() => {
						const done = { onSuccess: closeChange };
						if (change.kind === "delete")
							actions.remove.mutate(change.flow.approvalFlowId, done);
						else
							actions.toggle.mutate(
								{
									flowId: change.flow.approvalFlowId,
									body: toggledFlowBodyOf(change.flow),
								},
								done
							);
					}}
				/>
			)}
		</>
	);
};
