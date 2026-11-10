import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ApiProblemError } from "@/common/problem";
import { mapRefusal } from "@/common/refusal";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PlusIcon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import type {
	DepartmentConstraint,
	PolicyLock,
} from "@/features/scheduling/constraints/api";
import { ConstraintDialog } from "@/features/scheduling/constraints/ConstraintDialog";
import type { ConstraintOptionsState } from "@/features/scheduling/constraints/useConstraintOptions";
import {
	policyConstraintsQuery,
	policyOptionsQuery,
} from "@/features/scheduling/policy/api";
import { usePolicyActions } from "@/features/scheduling/policy/usePolicyActions";
import { schedulingPolicyColumns } from "@/features/settings/SchedulingPolicySettings/schedulingPolicyColumns";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

export type SchedulingPolicySettingsProps = {
	companyId: string;
};

/**
 * Settings › Scheduling: the company's Scheduling policy (ADR-0058), the
 * constraints every department's schedules follow. Each reads as its type's
 * sentence with its lock; adding, editing and removing need
 * `scheduling_policy:update` held company-wide, and the list itself
 * `scheduling_policy:read`. The constraint dialog is the department's, with
 * the lock offered and only the types a company may set.
 */
export const SchedulingPolicySettings = ({
	companyId,
}: SchedulingPolicySettingsProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "settings.scheduling.policy";
	const access = useAccess();
	const canRead = access.can("scheduling_policy:read", COMPANY_SCOPE);
	const canUpdate = access.can("scheduling_policy:update", COMPANY_SCOPE);
	const list = useQuery(policyConstraintsQuery(companyId, canRead));
	const [dialog, setDialog] = useState<{
		editing?: DepartmentConstraint;
	} | null>(null);
	const [removing, setRemoving] = useState<DepartmentConstraint | null>(null);
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const offered = useQuery(
		policyOptionsQuery(companyId, canRead && dialog !== null)
	);
	const actions = usePolicyActions(companyId);
	const options: ConstraintOptionsState =
		offered.data === undefined
			? { status: offered.isError ? "error" : "pending" }
			: { status: "ready", options: offered.data };
	const notify = (message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	};
	const columns = useMemo(
		(): Array<DataTableColumn<DepartmentConstraint>> =>
			schedulingPolicyColumns(t, {
				canUpdate,
				onEdit: (constraint) => {
					setDialog({ editing: constraint });
				},
				onRemove: setRemoving,
			}),
		[t, canUpdate, setDialog, setRemoving]
	);
	const forbidden =
		!canRead ||
		(list.error instanceof ApiProblemError && list.error.status === 403);
	const problem = forbidden
		? t(`${key}.hidden`)
		: list.isError
			? t(`${key}.failed`)
			: list.data === undefined
				? t(`${key}.loading`)
				: undefined;

	return (
		<>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="text-xl font-semibold text-neutral-900">
						{t(`${key}.title`)}
					</h2>
					<p className="mt-3 text-sm text-neutral-800">
						{t(`${key}.subtitle`)}
					</p>
					<p className="mt-2 text-sm text-neutral-800">
						<Trans
							i18nKey={`${key}.termsLink`}
							components={[
								<Button
									key="employment"
									search={{ section: "employment" }}
									to="/settings"
									variant="textlink"
								/>,
							]}
						/>
					</p>
				</div>
				{canUpdate && (
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
					className="mt-8 text-sm text-neutral-700 data-alert:text-error-700"
					data-alert={list.isError && !forbidden ? true : undefined}
					role={list.isError && !forbidden ? "alert" : undefined}
				>
					{problem}
				</p>
			) : (
				<DataTable
					className="mt-8"
					columns={columns}
					data={list.data ?? []}
					emptyState={t(`${key}.empty`)}
					getRowId={(constraint) => constraint.constraintId}
					label={t(`${key}.label`)}
				/>
			)}
			{dialog && (
				<ConstraintDialog
					withLock
					editing={dialog.editing}
					options={options}
					onClose={() => {
						setDialog(null);
					}}
					onSave={async ({ lock, ...constraint }) => {
						const body = { ...constraint, lock: lock as PolicyLock };
						const editing = dialog.editing;
						await (editing
							? actions.updateConstraint.mutateAsync({
									constraintId: editing.constraintId,
									body,
								})
							: actions.createConstraint.mutateAsync(body));
						notify(t(editing ? `${key}.saved` : `${key}.added`));
					}}
				/>
			)}
			{removing && (
				<ConfirmDialog
					cancelLabel={t(`${key}.cancel`)}
					confirmLabel={t(`${key}.deleteConfirm`)}
					description={t(`${key}.deleteDescription`)}
					submitting={actions.deleteConstraint.isPending}
					title={t(`${key}.deleteTitle`, { name: removing.name })}
					tone="danger"
					error={
						actions.deleteConstraint.error
							? mapRefusal(actions.deleteConstraint.error, {
									alerts: {
										"404 CONSTRAINT_NOT_FOUND": t(
											"scheduling.constraints.dialog.gone"
										),
									},
									forbidden: t(`${key}.deleteForbidden`),
									failed: t(`${key}.deleteFailed`),
								}).message
							: undefined
					}
					onClose={() => {
						actions.deleteConstraint.reset();
						setRemoving(null);
					}}
					onConfirm={() => {
						actions.deleteConstraint.mutate(removing.constraintId, {
							onSuccess: () => {
								setRemoving(null);
								notify(t(`${key}.deleted`));
							},
						});
					}}
				/>
			)}
			{toast && (
				<Toast
					key={toast.id}
					onDismiss={() => {
						setToast(undefined);
					}}
				>
					{toast.message}
				</Toast>
			)}
		</>
	);
};
