import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DepartmentPath } from "@/common/companyPath";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tab, TabList, Tabs } from "@/components/ui/Tabs";
import { Toast } from "@/components/ui/Toast";
import { placeOf } from "@/features/organisation/assignmentTargets";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import {
	CONSTRAINT_CATEGORIES,
	type ConstraintBody,
	type DepartmentConstraint,
} from "@/features/scheduling/constraints/api";
import { ConstraintDialog } from "@/features/scheduling/constraints/ConstraintDialog";
import { deleteConstraintRefusal } from "@/features/scheduling/constraints/constraintRefusal";
import { ConstraintTable } from "@/features/scheduling/constraints/ConstraintTable";
import { useConstraintActions } from "@/features/scheduling/constraints/useConstraintActions";
import { useConstraintOptions } from "@/features/scheduling/constraints/useConstraintOptions";
import { useConstraintsInUnits } from "@/features/scheduling/constraints/useConstraintsInUnits";
import { departmentUnitOf } from "@/features/scheduling/departmentUnit";
import { initialDepartmentOf } from "@/features/scheduling/setupDepartment";
import { deleteCopy, editNote } from "@/features/scheduling/setupReach";
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

const CREATE_KEYS: ReadonlyArray<PermissionKey> = ["constraint:create"];
/** A dialog's department is one the person may add constraints to, or change them in. */
const DIALOG_KEYS: ReadonlyArray<PermissionKey> = [
	"constraint:create",
	"constraint:update",
];

/** The first category tab shows every constraint; the ones after it, one category each. */
const ALL_TAB = 0;

/** What the list says instead of its rows while they load, are refused or failed. */
const LIST_STATUS_COPY = {
	pending: "scheduling.constraints.loading",
	hidden: "scheduling.constraints.hidden",
	error: "scheduling.constraints.failed",
} as const;

/**
 * The add dialog with the department chosen so far, the edit dialog with its
 * constraint (and the company constraint a replacement stands in for), or
 * the dialog making a company constraint stricter in the chosen department.
 */
type DialogState =
	| { kind: "add"; departmentId: string }
	| {
			kind: "edit";
			constraint: DepartmentConstraint;
			replacing?: DepartmentConstraint;
	  }
	| { kind: "replace"; replacing: DepartmentConstraint };

/** The route a department constraint's own department names; none for a company constraint. */
const unitOf = (
	constraint: DepartmentConstraint
): DepartmentPath | undefined =>
	constraint.branchId && constraint.departmentId
		? { branchId: constraint.branchId, departmentId: constraint.departmentId }
		: undefined;

/** A company constraint the department replaced is shown through its replacement, not twice. */
const isShown = (constraint: DepartmentConstraint): boolean =>
	!constraint.overriddenByConstraintId;

const matches = (constraint: DepartmentConstraint, search: string): boolean => {
	const text = search.trim().toLocaleLowerCase();
	return (
		text === "" ||
		constraint.name.toLocaleLowerCase().includes(text) ||
		(constraint.departmentName ?? "").toLocaleLowerCase().includes(text)
	);
};

export type ConstraintsTabProps = {
	companyId: string;
	/** The header's Branch and the Department chosen in the Filters. */
	units: ResolvedUnitSelection;
	/** Writes the chosen Department to the URL; undefined for every Department. */
	onDepartmentChange: (department: string | undefined) => void;
};

/**
 * The live constraints of the departments in the header's Branch, narrowed
 * to one from the Filters and to a category by its tabs, as Job titles
 * lists its titles: add, edit and delete where the person's keys allow,
 * each dialog saying what the change reaches. Company constraints come
 * first and once; under one department they can be made stricter there.
 */
export const ConstraintsTab = ({
	companyId,
	units,
	onDepartmentChange,
}: ConstraintsTabProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.constraintsTab";
	const access = useAccess();
	const canCreate = access.canAnywhere("constraint:create");
	// Edit and Delete each follow their own key at the row's department.
	const canEdit = useCallback(
		(constraint: DepartmentConstraint): boolean =>
			constraint.departmentId !== null &&
			access.can("constraint:update", departmentScope(constraint.departmentId)),
		[access]
	);
	const canDelete = useCallback(
		(constraint: DepartmentConstraint): boolean =>
			constraint.departmentId !== null &&
			access.can("constraint:delete", departmentScope(constraint.departmentId)),
		[access]
	);
	// A company constraint is made stricter only in the one department chosen, where the person may add.
	const replacesHere =
		units.department !== undefined &&
		access.can(
			"constraint:create",
			departmentScope(units.department.departmentId)
		);
	const { data: workspace } = useQuery({ ...workspaceQuery, retry });
	const list = useConstraintsInUnits(companyId, units);
	const actions = useConstraintActions(companyId);
	const [search, setSearch] = useState("");
	const [tab, setTab] = useState(ALL_TAB);
	const [dialog, setDialog] = useState<DialogState>();
	const [deleting, setDeleting] = useState<DepartmentConstraint>();
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const notify = (message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	};

	const items = list.status === "ready" ? list.items : [];
	const rows = items.filter(
		(constraint) => isShown(constraint) && matches(constraint, search)
	);
	const categories = CONSTRAINT_CATEGORIES.filter((category) =>
		rows.some((constraint) => constraint.category === category)
	);
	// A category that disappears takes its tab with it, so an index past the end means "all".
	const selected = tab > categories.length ? ALL_TAB : tab;
	const category = selected === ALL_TAB ? undefined : categories[selected - 1];
	const countOf = (name: string): number =>
		rows.filter((constraint) => constraint.category === name).length;
	const shown =
		category === undefined
			? rows
			: rows.filter((constraint) => constraint.category === category);
	// The Branch is the header's scope; the Department is the one filter.
	const chips = departmentChips(
		units,
		() => {
			onDepartmentChange(undefined);
		},
		t
	);

	// The add dialog offers the active departments of the header's Branch where the person may add constraints.
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
		dialog?.kind === "add"
			? dialog.departmentId
			: dialog?.kind === "edit"
				? (dialog.constraint.departmentId ?? undefined)
				: units.department?.departmentId;
	const dialogUnit =
		dialog && workspace && dialogDepartmentId
			? departmentUnitOf(workspace, companyId, DIALOG_KEYS, dialogDepartmentId)
			: undefined;
	const options = useConstraintOptions(
		companyId,
		dialogUnit,
		dialog !== undefined
	);

	// Edit and delete say how many drafts tick the constraint, where schedules may be read.
	const reached = dialog?.kind === "edit" ? dialog.constraint : deleting;
	const draftCount = useDraftCount(
		companyId,
		reached && unitOf(reached),
		reached && { kind: "constraint", id: reached.constraintId }
	);

	const openEdit = (constraint: DepartmentConstraint): void => {
		// A replacement is edited against the company constraint it replaces.
		const replacing = constraint.overridesConstraintId
			? items.find(
					(row) => row.constraintId === constraint.overridesConstraintId
				)
			: undefined;
		setDialog({ kind: "edit", constraint, replacing });
	};
	const saveConstraint = async (body: ConstraintBody): Promise<void> => {
		const editedUnit =
			dialog?.kind === "edit" ? unitOf(dialog.constraint) : undefined;
		if (dialog?.kind === "edit" && editedUnit) {
			await actions.updateConstraint.mutateAsync({
				unit: editedUnit,
				constraintId: dialog.constraint.constraintId,
				body,
			});
			notify(t("scheduling.constraints.edited"));
			return;
		}
		if (!dialogUnit) return;
		await actions.createConstraint.mutateAsync({ unit: dialogUnit, body });
		notify(t("scheduling.constraints.added"));
	};
	const closeDelete = (): void => {
		actions.deleteConstraint.reset();
		setDeleting(undefined);
	};
	const deletingUnit = deleting && unitOf(deleting);

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
				createLabel={t("scheduling.constraints.add")}
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
				<div className="mt-8">
					{rows.length > 0 && (
						<Tabs selectedIndex={selected} onChange={setTab}>
							<TabList aria-label={t("scheduling.constraints.categoriesLabel")}>
								<Tab count={rows.length}>
									{t("scheduling.constraints.allConstraints")}
								</Tab>
								{categories.map((each) => (
									<Tab key={each} count={countOf(each)}>
										{t(`scheduling.constraints.categories.${each}`)}
									</Tab>
								))}
							</TabList>
						</Tabs>
					)}
					<ConstraintTable
						canDelete={canDelete}
						canEdit={canEdit}
						className={rows.length > 0 ? "mt-6" : undefined}
						constraints={shown}
						showBranch={!units.branch}
						showDepartment={!units.department}
						emptyState={
							search.trim()
								? t(`${key}.noMatch`)
								: t("scheduling.constraints.empty")
						}
						onDelete={setDeleting}
						onEdit={openEdit}
						onReplace={
							replacesHere
								? (replacing): void => {
										setDialog({ kind: "replace", replacing });
									}
								: undefined
						}
					/>
				</div>
			) : (
				<p
					className="mt-8 text-sm text-neutral-700"
					role={list.status === "error" ? "alert" : "status"}
				>
					{t(LIST_STATUS_COPY[list.status])}
				</p>
			)}
			{dialog && (
				<ConstraintDialog
					key={
						dialog.kind === "edit"
							? dialog.constraint.constraintId
							: dialog.kind
					}
					editing={dialog.kind === "edit" ? dialog.constraint : undefined}
					options={options}
					replacing={dialog.kind === "add" ? undefined : dialog.replacing}
					department={
						dialog.kind === "add"
							? {
									kind: "choose",
									companyId,
									branchId: units.branch?.branchId,
									keys: CREATE_KEYS,
									value: dialog.departmentId,
									onChange: (departmentId): void => {
										setDialog({ kind: "add", departmentId });
									},
								}
							: {
									kind: "fixed",
									departmentId: dialogDepartmentId ?? "",
									label:
										dialog.kind === "edit"
											? placeOf(
													{
														branchName:
															dialog.constraint.branchName ?? undefined,
														departmentName:
															dialog.constraint.departmentName ?? undefined,
													},
													t
												)
											: placeOf(
													{
														branchName: units.department?.branchName,
														departmentName: units.department?.name,
													},
													t
												),
								}
					}
					impactNote={
						dialog.kind === "edit"
							? editNote(
									t,
									"constraint",
									dialog.constraint.departmentName ?? "",
									draftCount
								)
							: undefined
					}
					onSave={saveConstraint}
					onClose={() => {
						setDialog(undefined);
					}}
				/>
			)}
			{deleting && (
				<ConfirmDialog
					{...deleteCopy(
						t,
						"constraint",
						deleting.name,
						deleting.departmentName ?? "",
						draftCount
					)}
					cancelLabel={t("scheduling.reach.cancel")}
					submitting={actions.deleteConstraint.isPending}
					tone="danger"
					error={
						actions.deleteConstraint.error
							? deleteConstraintRefusal(actions.deleteConstraint.error, t)
							: undefined
					}
					onClose={closeDelete}
					onConfirm={() => {
						if (!deletingUnit) return;
						actions.deleteConstraint.mutate(
							{ unit: deletingUnit, constraintId: deleting.constraintId },
							{
								onSuccess: () => {
									closeDelete();
									notify(t("scheduling.constraints.deleted"));
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
