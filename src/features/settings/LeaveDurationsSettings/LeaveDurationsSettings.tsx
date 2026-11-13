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
	leaveDurationCatalogueQuery,
	type ManagedLeaveDuration,
} from "@/features/leaveDurations/api";
import {
	byDisplayOrder,
	movedOrder,
	statusToggleBody,
} from "@/features/leaveDurations/leaveDurationCatalogue";
import { LeaveDurationDialog } from "@/features/leaveDurations/LeaveDurationDialog";
import { manageableReach } from "@/features/leaveDurations/manageableReach";
import { useLeaveDurationActions } from "@/features/leaveDurations/useLeaveDurationActions";
import { leaveDurationColumns } from "@/features/settings/LeaveDurationsSettings/leaveDurationColumns";
import { useMovedArrowFocus } from "@/features/settings/LeaveTypesSettings/useMovedArrowFocus";
import { workspaceQuery } from "@/features/workspace/api";
import { retry } from "@/features/workspace/retry";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { reachChoicesOf } from "@/features/workspace/unitReach";
import { useAccess } from "@/features/workspace/useAccess";

export type LeaveDurationsSettingsProps = {
	companyId: string;
};

const UPDATE_KEY = "leave_duration:update";
const NO_CHOICES = { branches: [], departments: [] };
const key = "settings.leave.durations";

/**
 * Settings › Leave: the company's leave durations (the API's ADR-0077), the
 * parts of a day people can take as leave. One list in the company order.
 * Department admins manage the durations of their own units: the list shows
 * the whole company's durations and those of the reader's units, and a row
 * covering departments they don't manage shows a lock instead of its
 * actions (the API's `canEdit`). Adding offers only the reaches they may
 * save; reordering needs `leave_duration:update` company-wide.
 */
export const LeaveDurationsSettings = ({
	companyId,
}: LeaveDurationsSettingsProps): FunctionComponent => {
	const { t } = useTranslation();
	const access = useAccess();
	const canRead = access.canAnywhere("leave_duration:read");
	const canUpdate = access.canAnywhere(UPDATE_KEY);
	const canReorder = access.can(UPDATE_KEY, COMPANY_SCOPE);
	const list = useQuery(leaveDurationCatalogueQuery(companyId, canRead));
	const { data: workspace } = useQuery({ ...workspaceQuery, retry });
	const actions = useLeaveDurationActions(companyId);
	const reach = useMemo(
		() =>
			manageableReach(
				workspace
					? reachChoicesOf(workspace, companyId, UPDATE_KEY)
					: NO_CHOICES,
				(target) => access.can(UPDATE_KEY, target)
			),
		[workspace, companyId, access]
	);
	const [dialog, setDialog] = useState<{
		editing?: ManagedLeaveDuration;
	} | null>(null);
	const [toggling, setToggling] = useState<ManagedLeaveDuration | null>(null);
	const [deleting, setDeleting] = useState<ManagedLeaveDuration | null>(null);
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const durations = useMemo(
		() => [...(list.data ?? [])].sort(byDisplayOrder),
		[list.data]
	);
	const canMoveDuration = useCallback(
		(leaveDurationId: string, direction: "up" | "down"): boolean =>
			movedOrder(durations, leaveDurationId, direction) !== null,
		[durations]
	);
	const { containerRef, rememberMove } = useMovedArrowFocus(canMoveDuration);
	const notify = useCallback((message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	}, []);
	const reorder = actions.reorderLeaveDurations;
	// Arrows stay pressable at either end and while a move saves; a move that cannot happen does nothing.
	const move = useCallback(
		(duration: ManagedLeaveDuration, direction: "up" | "down"): void => {
			const order = movedOrder(durations, duration.leaveDurationId, direction);
			if (!order || reorder.isPending) return;
			rememberMove(duration.leaveDurationId, direction);
			reorder.mutate(order, {
				onSuccess: () => {
					notify(
						t(`${key}.moved`, {
							name: duration.name,
							position:
								order.leaveDurationIds.indexOf(duration.leaveDurationId) + 1,
						})
					);
				},
			});
		},
		[t, durations, reorder, notify, rememberMove]
	);
	const columns = useMemo(
		() =>
			leaveDurationColumns(t, {
				canUpdate,
				canReorder,
				canMove: (duration, direction) =>
					!reorder.isPending &&
					canMoveDuration(duration.leaveDurationId, direction),
				onMove: move,
				onEdit: (duration) => {
					setDialog({ editing: duration });
				},
				onToggleStatus: setToggling,
				onDelete: setDeleting,
			}),
		[t, canUpdate, canReorder, reorder.isPending, canMoveDuration, move]
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
	const reorderFailure = reorder.error
		? mapRefusal(reorder.error, {
				// Another admin changed the list; it has been reloaded, so the next move works.
				alerts: {
					"400 INVALID_LEAVE_DURATION_ORDER": t(`${key}.orderStale`),
				},
				forbidden: t(`${key}.changeForbidden`),
				failed: t(`${key}.reorderFailed`),
			}).message
		: undefined;
	const toggle = actions.updateLeaveDuration;
	const remove = actions.deleteLeaveDuration;
	const changeRefusals = {
		"403 LEAVE_DURATION_NOT_COVERED": t(
			"settings.leave.durationDialog.notCovered"
		),
		"404 LEAVE_DURATION_NOT_FOUND": t("settings.leave.durationDialog.gone"),
	};

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
				{reach.reaches.length > 0 && (
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
				<div ref={containerRef} className="mt-8">
					<DataTable
						columns={columns}
						data={durations}
						emptyState={t(`${key}.empty`)}
						getRowId={(duration) => duration.leaveDurationId}
						label={t(`${key}.title`)}
					/>
				</div>
			)}
			{dialog && (
				<LeaveDurationDialog
					editing={dialog.editing}
					reach={reach}
					onClose={() => {
						setDialog(null);
					}}
					onSave={async (body) => {
						const editing = dialog.editing;
						await (editing
							? actions.updateLeaveDuration.mutateAsync({
									leaveDurationId: editing.leaveDurationId,
									// The status changes from the row's menu (with its confirm), never here; the edit
									// sends the status the duration already has.
									body: {
										...body,
										status:
											editing.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
									},
								})
							: actions.createLeaveDuration.mutateAsync(body));
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
								description: t(`${key}.deactivateDescription`),
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
									alerts: changeRefusals,
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
								leaveDurationId: toggling.leaveDurationId,
								body: statusToggleBody(toggling),
							},
							{
								onSuccess: () => {
									setToggling(null);
									notify(
										t(
											deactivating ? `${key}.deactivated` : `${key}.activated`,
											{ name: toggling.name }
										)
									);
								},
							}
						);
					}}
				/>
			)}
			{deleting && (
				<ConfirmDialog
					cancelLabel={t(`${key}.cancel`)}
					confirmLabel={t(`${key}.deleteConfirm`)}
					description={t(`${key}.deleteDescription`)}
					submitting={remove.isPending}
					title={t(`${key}.deleteTitle`, { name: deleting.name })}
					tone="danger"
					error={
						remove.error
							? mapRefusal(remove.error, {
									alerts: changeRefusals,
									forbidden: t(`${key}.changeForbidden`),
									failed: t(`${key}.deleteFailed`),
								}).message
							: undefined
					}
					onClose={() => {
						remove.reset();
						setDeleting(null);
					}}
					onConfirm={() => {
						remove.mutate(deleting.leaveDurationId, {
							onSuccess: () => {
								setDeleting(null);
								notify(t(`${key}.deleted`, { name: deleting.name }));
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
