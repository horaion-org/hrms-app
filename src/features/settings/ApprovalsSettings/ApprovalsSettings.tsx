import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
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
	SCHEDULE_PUBLICATION,
	type ApprovalFlow,
} from "@/features/approvals/api";
import { ApprovalFlowDialog } from "@/features/approvals/ApprovalFlowDialog";
import {
	createFlowBodyOf,
	toggledFlowBodyOf,
	updateFlowBodyOf,
} from "@/features/approvals/ApprovalFlowDialog/schema";
import { approvalFlowColumns } from "@/features/approvals/approvalFlowColumns";
import { flowChangeRefusal } from "@/features/approvals/approvalRefusal";
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
};

const key = "approvals.flows";

/** A row's change waiting on its confirm: turning it on or off, or deleting it. */
type Change = { kind: "toggle" | "delete"; flow: ApprovalFlow };

/**
 * Settings › Approvals: who approves a roster before it is published. One
 * row per flow (where it applies, its steps, on or off), the company-wide
 * flow first; with none, publishing stays one click. The list needs
 * `approval_flow:read`, and adding, editing, turning on or off and deleting
 * need `approval_flow:manage`, both held company-wide; the page passes
 * whether they are held.
 */
export const ApprovalsSettings = ({
	companyId,
	canRead,
	canManage,
}: ApprovalsSettingsProps): FunctionComponent => {
	const { t } = useTranslation();
	const flows = useQuery(approvalFlowsQuery(companyId, canRead));
	const workspace = useQuery({ ...workspaceQuery, retry });
	const actions = useApprovalFlowActions(companyId);
	const [dialog, setDialog] = useState<{ editing?: ApprovalFlow } | null>(null);
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
			<div>
				<h2 className="text-xl font-semibold text-neutral-900">
					{t(`${key}.title`)}
				</h2>
				<p className="mt-3 text-sm text-neutral-800">{t(`${key}.subtitle`)}</p>
			</div>
			<section className="mt-8 flex flex-col gap-3">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<h3 className="text-sm font-semibold text-neutral-900">
						{t(`${key}.schedulePublishing`)}
					</h3>
					{canManage && (
						<Button
							className="self-start"
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
						className="text-sm text-neutral-700 data-alert:text-error-700"
						data-alert={flows.isError && !forbidden ? true : undefined}
						role={flows.isError && !forbidden ? "alert" : undefined}
					>
						{problem}
					</p>
				) : (flows.data ?? []).length === 0 ? (
					<p className="text-sm text-neutral-700">{t(`${key}.empty`)}</p>
				) : (
					<DataTable
						columns={columns}
						data={flows.data ?? []}
						emptyState=""
						getRowId={(flow) => flow.approvalFlowId}
						label={t(`${key}.schedulePublishing`)}
					/>
				)}
			</section>
			{dialog && (
				<ApprovalFlowDialog
					companyId={companyId}
					subjectType={SCHEDULE_PUBLICATION}
					departmentName={(departmentId) => departmentNames.get(departmentId)}
					editing={dialog.editing}
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
									createFlowBodyOf(values, SCHEDULE_PUBLICATION)
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
								description: t(`${key}.deleteDescription`),
								confirmLabel: t(`${key}.deleteConfirm`),
							}
						: change.flow.active
							? {
									title: t(`${key}.turnOffTitle`, { name: change.flow.name }),
									description: t(`${key}.turnOffDescription`),
									confirmLabel: t(`${key}.turnOffConfirm`),
								}
							: {
									title: t(`${key}.turnOnTitle`, { name: change.flow.name }),
									description: t(`${key}.turnOnDescription`),
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
