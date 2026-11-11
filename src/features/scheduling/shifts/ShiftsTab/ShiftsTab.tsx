import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DepartmentPath } from "@/common/companyPath";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
import { placeOf } from "@/features/organisation/assignmentTargets";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import { constraintsQuery } from "@/features/scheduling/constraints/api";
import { departmentUnitOf } from "@/features/scheduling/departmentUnit";
import { initialDepartmentOf } from "@/features/scheduling/setupDepartment";
import {
	constraintsNamingShift,
	deleteCopy,
	editNote,
} from "@/features/scheduling/setupReach";
import {
	groupsOf,
	type DepartmentShift,
	type ShiftBody,
} from "@/features/scheduling/shifts/api";
import { ShiftDialog } from "@/features/scheduling/shifts/ShiftDialog";
import { deleteShiftRefusal } from "@/features/scheduling/shifts/shiftRefusal";
import { ShiftTable } from "@/features/scheduling/shifts/ShiftTable";
import { useShiftActions } from "@/features/scheduling/shifts/useShiftActions";
import { useShiftRoleOptions } from "@/features/scheduling/shifts/useShiftRoleOptions";
import { useShiftsInUnits } from "@/features/scheduling/shifts/useShiftsInUnits";
import { useDraftCount } from "@/features/scheduling/useDraftCount";
import { workspaceQuery } from "@/features/workspace/api";
import { DepartmentFilter } from "@/features/workspace/DepartmentFilter";
import { departmentChips } from "@/features/workspace/filterChips";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { departmentScope } from "@/features/workspace/scopes";
import { departmentChoices } from "@/features/workspace/unitChoices";
import {
	offersDepartmentChoice,
	type ResolvedUnitSelection,
} from "@/features/workspace/unitSelection";
import { useAccess } from "@/features/workspace/useAccess";

const CREATE_KEYS: ReadonlyArray<PermissionKey> = ["shift:create"];
/** A dialog's department is one the person may add shifts to, or change them in. */
const DIALOG_KEYS: ReadonlyArray<PermissionKey> = [
	"shift:create",
	"shift:update",
];

/** What the list says instead of its rows while they load, are refused or failed. */
const LIST_STATUS_COPY = {
	pending: "scheduling.shifts.loading",
	hidden: "scheduling.shifts.hidden",
	error: "scheduling.shifts.failed",
} as const;

/** The add dialog with the department chosen so far, or the edit dialog with its shift. */
type DialogState =
	| { kind: "add"; departmentId: string }
	| { kind: "edit"; shift: DepartmentShift };

/** The route a shift's own department names. */
const unitOf = (shift: DepartmentShift): DepartmentPath => ({
	branchId: shift.branchId,
	departmentId: shift.departmentId,
});

const matches = (shift: DepartmentShift, search: string): boolean => {
	const text = search.trim().toLocaleLowerCase();
	return (
		text === "" ||
		shift.name.toLocaleLowerCase().includes(text) ||
		shift.departmentName.toLocaleLowerCase().includes(text)
	);
};

export type ShiftsTabProps = {
	companyId: string;
	/** The header's Branch and the Department chosen in the Filters. */
	units: ResolvedUnitSelection;
	/** Writes the chosen Department to the URL; undefined for every Department. */
	onDepartmentChange: (department: string | undefined) => void;
};

/**
 * The live shifts of the departments in the header's Branch, narrowed to
 * one from the Filters, as Job titles lists its titles: add, edit and delete
 * where the person's keys allow, each dialog saying what the change reaches.
 */
export const ShiftsTab = ({
	companyId,
	units,
	onDepartmentChange,
}: ShiftsTabProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.shiftsTab";
	const access = useAccess();
	const canCreate = access.canAnywhere("shift:create");
	// Edit and Delete each follow their own key at the row's department.
	const canEdit = useCallback(
		(shift: DepartmentShift): boolean =>
			access.can("shift:update", departmentScope(shift.departmentId)),
		[access]
	);
	const canDelete = useCallback(
		(shift: DepartmentShift): boolean =>
			access.can("shift:delete", departmentScope(shift.departmentId)),
		[access]
	);
	const { data: workspace } = useQuery({ ...workspaceQuery, retry });
	const list = useShiftsInUnits(companyId, units);
	const actions = useShiftActions(companyId);
	const [search, setSearch] = useState("");
	const [dialog, setDialog] = useState<DialogState>();
	const [deleting, setDeleting] = useState<DepartmentShift>();
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const notify = (message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	};

	const rows =
		list.status === "ready"
			? list.items.filter((shift) => matches(shift, search))
			: [];
	// The Branch is the header's scope; the Department is the one filter.
	const chips = departmentChips(
		units,
		() => {
			onDepartmentChange(undefined);
		},
		t
	);

	// The add dialog offers the active departments of the header's Branch where the person may add shifts.
	const addChoices = workspace
		? departmentChoices(workspace, companyId, CREATE_KEYS, {
				activeOnly: true,
			}).filter(
				(choice) =>
					units.branch === undefined ||
					choice.branchId === units.branch.branchId
			)
		: [];
	const dialogDepartmentId =
		dialog?.kind === "add" ? dialog.departmentId : dialog?.shift.departmentId;
	const dialogUnit =
		workspace && dialogDepartmentId
			? departmentUnitOf(workspace, companyId, DIALOG_KEYS, dialogDepartmentId)
			: undefined;
	const roles = useShiftRoleOptions(companyId, dialogUnit);
	const dialogGroups = groupsOf(
		list.status === "ready"
			? list.items.filter((shift) => shift.departmentId === dialogDepartmentId)
			: []
	);

	// Edit and delete say how many drafts tick the shift, where schedules may be read.
	const reached = dialog?.kind === "edit" ? dialog.shift : deleting;
	const draftCount = useDraftCount(
		companyId,
		reached && unitOf(reached),
		reached && { kind: "shift", id: reached.shiftId }
	);
	// Deleting also says how many of the department's constraints name the shift, where they may be read.
	const readsConstraints =
		deleting !== undefined &&
		access.can("constraint:read", departmentScope(deleting.departmentId));
	const departmentConstraints = useQuery(
		constraintsQuery(companyId, deleting && unitOf(deleting), readsConstraints)
	);
	const namedBy =
		deleting && departmentConstraints.data
			? constraintsNamingShift(departmentConstraints.data, deleting.shiftId)
			: undefined;

	const saveShift = async (body: ShiftBody): Promise<void> => {
		if (dialog?.kind === "edit") {
			await actions.updateShift.mutateAsync({
				unit: unitOf(dialog.shift),
				shiftId: dialog.shift.shiftId,
				body,
			});
			notify(t("scheduling.shifts.edited"));
			return;
		}
		if (!dialogUnit) return;
		await actions.createShift.mutateAsync({ unit: dialogUnit, body });
		notify(t("scheduling.shifts.added"));
	};
	const closeDelete = (): void => {
		actions.deleteShift.reset();
		setDeleting(undefined);
	};

	return (
		<>
			<p className="mt-6 text-sm text-neutral-800">
				{units.department
					? t(`${key}.descriptionOne`, { department: units.department.name })
					: t(`${key}.descriptionAll`)}
			</p>
			<ListToolbar
				chips={chips}
				className="mt-6"
				createLabel={t("scheduling.shifts.add")}
				search={search}
				searchLabel={t(`${key}.search`)}
				filterFields={
					offersDepartmentChoice(units) && (
						<DepartmentFilter selection={units} onChange={onDepartmentChange} />
					)
				}
				onSearchChange={setSearch}
				onClearFilters={() => {
					onDepartmentChange(undefined);
				}}
				onCreate={
					canCreate
						? (): void => {
								setDialog({
									kind: "add",
									departmentId: initialDepartmentOf(
										addChoices,
										units.department?.departmentId
									),
								});
							}
						: undefined
				}
			/>
			{list.status === "ready" ? (
				<ShiftTable
					canDelete={canDelete}
					canEdit={canEdit}
					className="mt-8"
					shifts={rows}
					showBranch={!units.branch}
					showDepartment={!units.department}
					emptyState={
						search.trim() ? t(`${key}.noMatch`) : t("scheduling.shifts.empty")
					}
					onDelete={setDeleting}
					onEdit={(shift) => {
						setDialog({ kind: "edit", shift });
					}}
				/>
			) : (
				<p
					className="mt-8 text-sm text-neutral-700"
					role={list.status === "error" ? "alert" : "status"}
				>
					{t(LIST_STATUS_COPY[list.status])}
				</p>
			)}
			{dialog && (
				<ShiftDialog
					key={dialog.kind === "edit" ? dialog.shift.shiftId : "add"}
					editing={dialog.kind === "edit" ? dialog.shift : undefined}
					groups={dialogGroups}
					roles={roles}
					department={
						dialog.kind === "edit"
							? {
									kind: "fixed",
									departmentId: dialog.shift.departmentId,
									label: placeOf(dialog.shift, t),
								}
							: {
									kind: "choose",
									companyId,
									branchId: units.branch?.branchId,
									keys: CREATE_KEYS,
									value: dialog.departmentId,
									onChange: (departmentId): void => {
										setDialog({ kind: "add", departmentId });
									},
								}
					}
					impactNote={
						dialog.kind === "edit"
							? editNote(t, "shift", dialog.shift.departmentName, draftCount)
							: undefined
					}
					onSave={saveShift}
					onClose={() => {
						setDialog(undefined);
					}}
				/>
			)}
			{deleting && (
				<ConfirmDialog
					{...deleteCopy(
						t,
						"shift",
						deleting.name,
						deleting.departmentName,
						draftCount,
						namedBy
					)}
					cancelLabel={t("scheduling.reach.cancel")}
					confirmDisabled={readsConstraints && departmentConstraints.isPending}
					submitting={actions.deleteShift.isPending}
					tone="danger"
					error={
						actions.deleteShift.error
							? deleteShiftRefusal(actions.deleteShift.error, t)
							: undefined
					}
					onClose={closeDelete}
					onConfirm={() => {
						actions.deleteShift.mutate(
							{ unit: unitOf(deleting), shiftId: deleting.shiftId },
							{
								onSuccess: () => {
									closeDelete();
									notify(t("scheduling.shifts.deleted"));
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
