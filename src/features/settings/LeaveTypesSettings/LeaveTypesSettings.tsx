import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiProblemError } from "@/common/problem";
import { mapRefusal } from "@/common/refusal";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { PlusIcon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import {
	leaveTypeCatalogueQuery,
	type LeaveGrantKind,
	type ManagedLeaveType,
} from "@/features/leaveTypes/api";
import { LeaveTypeDialog } from "@/features/leaveTypes/LeaveTypeDialog";
import {
	catalogueSections,
	hasKnownKind,
	movedOrder,
	statusToggleBody,
} from "@/features/leaveTypes/leaveTypeCatalogue";
import { useLeaveTypeActions } from "@/features/leaveTypes/useLeaveTypeActions";
import {
	leaveTypeColumns,
	type LeaveTypeTableColumns,
} from "@/features/settings/LeaveTypesSettings/leaveTypeColumns";
import { useMovedArrowFocus } from "@/features/settings/LeaveTypesSettings/useMovedArrowFocus";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

export type LeaveTypesSettingsProps = {
	companyId: string;
};

type EditableLeaveType = ManagedLeaveType & { grantKind: LeaveGrantKind };

/** Only a type whose kind and status this app knows can be sent back whole. */
const isEditable = (type: ManagedLeaveType): type is EditableLeaveType =>
	hasKnownKind(type) && type.status !== "UNKNOWN";

const key = "settings.leave.types";

/**
 * Settings › Leave: the company's leave types (ADR-0055). The scheduler's day
 * off sits first, locked; then each grant kind's active types in the order
 * the apply form offers them, with up and down to reorder; then the inactive
 * ones, which can be activated again. Types are never deleted. The list needs
 * `leave_type:read` and every change `leave_type:update`, both held
 * company-wide.
 */
export const LeaveTypesSettings = ({
	companyId,
}: LeaveTypesSettingsProps): FunctionComponent => {
	const { t } = useTranslation();
	const access = useAccess();
	const canRead = access.can("leave_type:read", COMPANY_SCOPE);
	const canUpdate = access.can("leave_type:update", COMPANY_SCOPE);
	const list = useQuery(leaveTypeCatalogueQuery(companyId, canRead));
	const actions = useLeaveTypeActions(companyId);
	const [dialog, setDialog] = useState<{ editing?: EditableLeaveType } | null>(
		null
	);
	const [toggling, setToggling] = useState<EditableLeaveType | null>(null);
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const types = useMemo(() => list.data ?? [], [list.data]);
	const sections = useMemo(() => catalogueSections(types), [types]);
	const { containerRef, rememberMove } = useMovedArrowFocus(types);
	const notify = useCallback((message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	}, []);
	const reorder = actions.reorderLeaveTypes;
	// Arrows stay pressable at either end and while a move saves; a move that cannot happen does nothing.
	const move = useCallback(
		(type: ManagedLeaveType, direction: "up" | "down"): void => {
			const order = movedOrder(types, type.leaveTypeId, direction);
			if (!order || reorder.isPending) return;
			rememberMove(type.leaveTypeId, direction);
			reorder.mutate(order, {
				onSuccess: () => {
					notify(
						t(`${key}.moved`, {
							name: type.name,
							position: order.leaveTypeIds.indexOf(type.leaveTypeId) + 1,
							kind: t(`leave.grantKinds.${order.grantKind}`),
						})
					);
				},
			});
		},
		[t, types, reorder, notify, rememberMove]
	);
	const columns = useMemo(
		(): LeaveTypeTableColumns =>
			leaveTypeColumns(t, {
				canUpdate,
				isEditable,
				canMove: (type, direction) =>
					!reorder.isPending &&
					movedOrder(types, type.leaveTypeId, direction) !== null,
				onMove: move,
				onEdit: (type) => {
					if (isEditable(type)) setDialog({ editing: type });
				},
				onToggleStatus: (type) => {
					if (isEditable(type)) setToggling(type);
				},
			}),
		[t, types, canUpdate, reorder.isPending, move]
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
	const reorderFailure = actions.reorderLeaveTypes.error
		? mapRefusal(actions.reorderLeaveTypes.error, {
				// Another admin changed the list; it has been reloaded, so the next move works.
				alerts: {
					"400 INVALID_LEAVE_TYPE_ORDER": t(`${key}.orderStale`),
					"404 LEAVE_TYPE_NOT_FOUND": t(`${key}.orderStale`),
				},
				forbidden: t(`${key}.changeForbidden`),
				failed: t(`${key}.reorderFailed`),
			}).message
		: undefined;
	const toggle = actions.updateLeaveType;

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
			{reorderFailure && (
				<p className="mt-6 text-sm text-error-700" role="alert">
					{reorderFailure}
				</p>
			)}
			{problem ? (
				<p
					className="mt-8 text-sm text-neutral-700 data-alert:text-error-700"
					data-alert={list.isError && !forbidden ? true : undefined}
					role={list.isError && !forbidden ? "alert" : undefined}
				>
					{problem}
				</p>
			) : (
				<div ref={containerRef} className="mt-8 flex flex-col gap-8">
					{sections.system.length > 0 && (
						<section className="flex flex-col gap-3">
							<div>
								<h3 className="text-sm font-semibold text-neutral-900">
									{t(`${key}.systemHeading`)}
								</h3>
								<p className="mt-1 text-sm text-neutral-700">
									{t(`${key}.systemDescription`)}
								</p>
							</div>
							<DataTable
								columns={columns.system}
								data={sections.system}
								emptyState=""
								getRowId={(type) => type.leaveTypeId}
								label={t(`${key}.systemHeading`)}
							/>
						</section>
					)}
					{sections.groups.length === 0 && (
						<p className="text-sm text-neutral-700">{t(`${key}.empty`)}</p>
					)}
					{sections.groups.map((group) => (
						<section key={group.grantKind} className="flex flex-col gap-3">
							<h3 className="text-sm font-semibold text-neutral-900">
								{t(`leave.grantKinds.${group.grantKind}`)}
							</h3>
							<DataTable
								columns={columns.active}
								data={group.types}
								emptyState=""
								getRowId={(type) => type.leaveTypeId}
								label={t(`leave.grantKinds.${group.grantKind}`)}
							/>
						</section>
					))}
					{sections.inactive.length > 0 && (
						<section className="flex flex-col gap-3">
							<h3 className="text-sm font-semibold text-neutral-900">
								{t(`${key}.inactiveHeading`, {
									count: sections.inactive.length,
								})}
							</h3>
							<DataTable
								columns={columns.inactive}
								data={sections.inactive}
								emptyState=""
								getRowId={(type) => type.leaveTypeId}
								label={t(`${key}.inactiveLabel`)}
							/>
						</section>
					)}
				</div>
			)}
			{dialog && (
				<LeaveTypeDialog
					editing={dialog.editing}
					onClose={() => {
						setDialog(null);
					}}
					onSave={async (body) => {
						const editing = dialog.editing;
						await (editing
							? actions.updateLeaveType.mutateAsync({
									leaveTypeId: editing.leaveTypeId,
									// The status changes from the row's menu (with its confirm saying what deactivating
									// does), never here; the edit sends the status the type already has.
									body: {
										...body,
										status:
											editing.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
									},
								})
							: actions.createLeaveType.mutateAsync(body));
						notify(t(editing ? `${key}.saved` : `${key}.added`));
					}}
				/>
			)}
			{toggling && (
				<ConfirmDialog
					cancelLabel={t(`${key}.cancel`)}
					submitting={toggle.isPending}
					{...(toggling.status === "ACTIVE"
						? {
								title: t(`${key}.deactivateTitle`, { name: toggling.name }),
								description: t(`${key}.deactivateDescription`, {
									count: toggling.requestCount,
								}),
								confirmLabel: t(`${key}.deactivateConfirm`),
							}
						: {
								title: t(`${key}.activateTitle`, { name: toggling.name }),
								description: t(`${key}.activateDescription`),
								confirmLabel: t(`${key}.activateConfirm`),
							})}
					error={
						toggle.error
							? mapRefusal(toggle.error, {
									alerts: {
										"409 LAST_ACTIVE_LEAVE_TYPE": t(`${key}.lastActive`),
										"409 LEAVE_TYPE_SYSTEM": t("settings.leave.dialog.system"),
										"404 LEAVE_TYPE_NOT_FOUND": t("settings.leave.dialog.gone"),
									},
									forbidden: t(`${key}.changeForbidden`),
									failed: t(`${key}.statusFailed`),
								}).message
							: undefined
					}
					onClose={() => {
						toggle.reset();
						setToggling(null);
					}}
					onConfirm={() => {
						const deactivating = toggling.status === "ACTIVE";
						toggle.mutate(
							{
								leaveTypeId: toggling.leaveTypeId,
								body: statusToggleBody(toggling),
							},
							{
								onSuccess: () => {
									setToggling(null);
									notify(
										t(
											deactivating ? `${key}.deactivated` : `${key}.activated`,
											{
												name: toggling.name,
											}
										)
									);
								},
							}
						);
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
