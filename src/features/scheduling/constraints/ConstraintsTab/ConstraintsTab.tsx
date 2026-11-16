import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DepartmentPath } from "@/common/companyPath";
import type { FunctionComponent } from "@/common/types";
import type { SelectOption } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LockIcon } from "@/components/ui/LockIcon";
import { Toast } from "@/components/ui/Toast";
import { placeOf } from "@/features/organisation/assignmentTargets";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import type {
	ConstraintBody,
	ConstraintCategory,
	ConstraintType,
	DepartmentConstraint,
} from "@/features/scheduling/constraints/api";
import {
	capacityProblemOf,
	type CapacityProblem,
} from "@/features/scheduling/constraints/capacityProblems";
import { useJobTitleHolders } from "@/features/scheduling/constraints/useJobTitleHolders";
import { ConstraintDialog } from "@/features/scheduling/constraints/ConstraintDialog";
import { typeGroupsOf } from "@/features/scheduling/constraints/ConstraintDialog/typeGroups";
import { deleteConstraintRefusal } from "@/features/scheduling/constraints/constraintRefusal";
import { ConstraintRow } from "@/features/scheduling/constraints/ConstraintRow";
import { ConstraintSection } from "@/features/scheduling/constraints/ConstraintSection";
import {
	COMPANY_SECTION,
	SHOWING_FIRMNESS,
	SHOWING_STATUSES,
	initiallyClosedOf,
	passesShowing,
	showingOf,
	showingValue,
} from "@/features/scheduling/constraints/constraintListView";
import { useSectionFolds } from "@/features/scheduling/useSectionFolds";
import { constraintSectionsOf } from "@/features/scheduling/constraints/constraintSections";
import {
	categoryIconOf,
	constraintTypeLookOf,
} from "@/features/scheduling/constraints/constraintTypeLooks";
import { needsAttention } from "@/features/scheduling/constraints/valueProblems";
import { useConstraintActions } from "@/features/scheduling/constraints/useConstraintActions";
import { useConstraintOptions } from "@/features/scheduling/constraints/useConstraintOptions";
import { useConstraintsInUnits } from "@/features/scheduling/constraints/useConstraintsInUnits";
import { departmentUnitOf } from "@/features/scheduling/departmentUnit";
import { ReadinessCallout } from "@/features/scheduling/readiness/ReadinessCallout";
import type { ReturnLink } from "@/features/scheduling/readiness/readinessCopy";
import { useSchedulingReadiness } from "@/features/scheduling/readiness/useSchedulingReadiness";
import { initialDepartmentOf } from "@/features/scheduling/setupDepartment";
import { deleteCopy, editNote } from "@/features/scheduling/setupReach";
import { useDraftCount } from "@/features/scheduling/useDraftCount";
import { workspaceQuery } from "@/features/workspace/api";
import { DepartmentFilter } from "@/features/workspace/DepartmentFilter";
import { departmentChips, filterChip } from "@/features/workspace/filterChips";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { COMPANY_SCOPE, departmentScope } from "@/features/workspace/scopes";
import { departmentChoices } from "@/features/workspace/unitChoices";
import {
	offersDepartmentChoice,
	selectedUnits,
	type ResolvedUnitSelection,
} from "@/features/workspace/unitSelection";
import { useAccess } from "@/features/workspace/useAccess";

const CREATE_KEYS: ReadonlyArray<PermissionKey> = ["constraint:create"];
/** A dialog's department is one the person may add constraints to, or change them in. */
const DIALOG_KEYS: ReadonlyArray<PermissionKey> = [
	"constraint:create",
	"constraint:update",
];

/** Where a row sits on the page, so the attention banner can bring it into view. */
const rowIdOf = (constraint: DepartmentConstraint): string =>
	`constraint-${constraint.constraintId}`;

/** Brings a row into view and moves focus to it, once its section has opened. */
const focusRow = (constraint: DepartmentConstraint): void => {
	requestAnimationFrame(() => {
		const row = document.getElementById(rowIdOf(constraint));
		row?.scrollIntoView?.({ block: "center" });
		row?.focus();
	});
};

/** The browser-storage key of the sections a person closed here; it holds section names only. */
const CLOSED_SECTIONS_KEY = "horaion.constraintSectionsClosed";

/** The section a constraint is listed in: its category, or the company's own. */
const sectionKeyOf = (constraint: DepartmentConstraint): string =>
	constraint.level === "COMPANY" ? COMPANY_SECTION : constraint.category;

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
	| { kind: "add"; departmentId: string; startAt?: ConstraintCategory }
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
	/** The way back into the wizard, when the wizard sent the person here to set a department up. */
	returnTo?: ReturnLink;
};

/**
 * The live constraints of the departments in the header's Branch, narrowed
 * to one from the Filters, in one section per purpose with what needs fixing
 * first and named in a banner: add, edit and delete where the person's keys
 * allow, each dialog saying what the change reaches. Company constraints
 * close the page, folded, once; under one department they can be made
 * stricter there. Where schedules may be read, a staffing rule asking for
 * more people than hold its job titles needs attention too.
 */
export const ConstraintsTab = ({
	companyId,
	units,
	onDepartmentChange,
	returnTo,
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
	const holders = useJobTitleHolders(companyId, units);
	const readiness = useSchedulingReadiness(companyId, selectedUnits(units));
	const actions = useConstraintActions(companyId);
	const [search, setSearch] = useState("");
	const [showingValues, setShowingValues] = useState<Array<string>>([]);
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
	// What a Showing value reads as, on its option and on its chip.
	const showingLabelOf = (value: string): string => {
		const [kind, choice = ""] = value.split(":");
		if (kind === "status")
			return choice === "INACTIVE"
				? t("scheduling.constraints.statuses.INACTIVE")
				: t("scheduling.constraints.problems.needsAttention");
		if (kind === "firmness")
			return t(
				choice === "SHOULD"
					? "scheduling.constraints.requirements.SHOULD"
					: "scheduling.constraints.requirements.MUST"
			);
		return constraintTypeLookOf(choice as ConstraintType, t).label;
	};
	// The Branch is the header's scope; the Department and Showing are the filters.
	const chips = [
		...departmentChips(
			units,
			() => {
				onDepartmentChange(undefined);
			},
			t
		),
		...showingValues.map((value) =>
			filterChip(
				value,
				t(`${key}.showing`),
				showingLabelOf(value),
				() => {
					setShowingValues(showingValues.filter((each) => each !== value));
				},
				t
			)
		),
	];

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
	// The types for the sentences: the chosen Department's, else the first in view with constraint:read (a type's flags are the same in every Department).
	const typesDepartment =
		units.department ??
		(workspace
			? departmentChoices(workspace, companyId, ["constraint:read"]).find(
					(choice) =>
						units.branch === undefined ||
						choice.branchId === units.branch.branchId
				)
			: undefined);
	const listOptions = useConstraintOptions(
		companyId,
		typesDepartment && {
			branchId: typesDepartment.branchId,
			departmentId: typesDepartment.departmentId,
		}
	);

	// A staffing rule that can never be met: the live rule against who holds its job titles now.
	const capacityOf = (
		constraint: DepartmentConstraint
	): CapacityProblem | undefined =>
		holders && capacityProblemOf(constraint, holders);
	const needsFixing = (constraint: DepartmentConstraint): boolean =>
		needsAttention(constraint.values) || capacityOf(constraint) !== undefined;
	const listTypes =
		listOptions.status === "ready" ? listOptions.options.types : [];
	// The Showing filter narrows the rows; the sections follow the categories the API lists, in its order.
	const showing = showingOf(showingValues);
	const shownRows = rows.filter((constraint) =>
		passesShowing(constraint, showing, needsFixing)
	);
	const laidOut = constraintSectionsOf(
		shownRows,
		typeGroupsOf(listTypes).map((group) => group.category),
		needsFixing
	);
	// What needs attention but the filter leaves out, so the banner says so.
	const attentionOutside =
		rows.filter(needsFixing).length - laidOut.needingAttention.length;
	const folds = useSectionFolds(
		CLOSED_SECTIONS_KEY,
		initiallyClosedOf([
			...laidOut.sections.map((section) => ({
				key: section.category,
				rowCount: section.rows.length,
				needsAttention: section.rows.some(needsFixing),
			})),
			{
				key: COMPANY_SECTION,
				rowCount: laidOut.company.length,
				needsAttention: laidOut.company.some(needsFixing),
			},
		])
	);
	// The Showing choices: status and firmness, then the kinds in view under their purpose, in the API's order.
	const kindsInView = typeGroupsOf(listTypes).flatMap((group) =>
		group.types
			.filter((option) => rows.some((row) => row.type === option.type))
			.map((option) => ({ type: option.type, category: group.category }))
	);
	const showingOptions: Array<SelectOption> = [
		...SHOWING_STATUSES.map((choice) => ({
			value: showingValue("status", choice),
			label: showingLabelOf(showingValue("status", choice)),
			group: t(`${key}.showingStatus`),
		})),
		...SHOWING_FIRMNESS.map((choice) => ({
			value: showingValue("firmness", choice),
			label: showingLabelOf(showingValue("firmness", choice)),
			group: t("scheduling.constraints.requirements.unset"),
		})),
		...kindsInView.map(({ type, category }) => ({
			value: showingValue("type", type),
			label: showingLabelOf(showingValue("type", type)),
			group: t(`scheduling.constraints.categories.${category}`),
		})),
	];
	const sectionKeys = [
		...laidOut.sections.map((section) => section.category),
		COMPANY_SECTION,
	];
	const showRow = (constraint: DepartmentConstraint): void => {
		folds.open(sectionKeyOf(constraint));
		focusRow(constraint);
	};
	// What a closed section says: how many it holds and, in the error tone, how many need attention.
	const gistOf = (
		sectionRows: Array<DepartmentConstraint>
	): FunctionComponent => {
		const attention = sectionRows.filter(needsFixing).length;
		return (
			<>
				{t(`${key}.sectionGist`, { count: sectionRows.length })}
				{attention > 0 && (
					<span className="font-semibold text-error-700">
						{" · "}
						{t(`${key}.gistAttention`, { count: attention })}
					</span>
				)}
			</>
		);
	};
	const openAdd = (startAt?: ConstraintCategory): void => {
		setDialog({
			kind: "add",
			departmentId: initialDepartmentOf(
				addChoices,
				units.department?.departmentId
			),
			startAt,
		});
	};
	const openEdit = (constraint: DepartmentConstraint): void => {
		// A replacement is edited against the company constraint it replaces.
		const replacing = constraint.overridesConstraintId
			? items.find(
					(row) => row.constraintId === constraint.overridesConstraintId
				)
			: undefined;
		setDialog({ kind: "edit", constraint, replacing });
	};
	const rowOf = (constraint: DepartmentConstraint): FunctionComponent => {
		const companyRow = constraint.level === "COMPANY";
		return (
			<ConstraintRow
				key={constraint.constraintId}
				capacity={capacityOf(constraint)}
				constraint={constraint}
				id={rowIdOf(constraint)}
				needsAttention={needsFixing(constraint)}
				showDepartment={!units.department}
				types={listTypes}
				onDelete={
					!companyRow && canDelete(constraint)
						? (): void => {
								setDeleting(constraint);
							}
						: undefined
				}
				onEdit={
					!companyRow && canEdit(constraint)
						? (): void => {
								openEdit(constraint);
							}
						: undefined
				}
				onReplace={
					companyRow && replacesHere
						? (): void => {
								setDialog({ kind: "replace", replacing: constraint });
							}
						: undefined
				}
			/>
		);
	};

	// Edit and delete say how many drafts tick the constraint, where schedules may be read.
	const reached = dialog?.kind === "edit" ? dialog.constraint : deleting;
	const draftCount = useDraftCount(
		companyId,
		reached && unitOf(reached),
		reached && { kind: "constraint", id: reached.constraintId }
	);

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
				actions={
					// Where the work policy's rows are set; only for those who may read it there.
					access.can("scheduling_policy:read", COMPANY_SCOPE) && (
						<Button
							search={{ section: "scheduling" }}
							to="/settings"
							variant="textlink"
						>
							{t(`${key}.openWorkPolicy`)}
						</Button>
					)
				}
				filterFields={
					offersDepartmentChoice(units) && (
						<DepartmentFilter selection={units} onChange={onDepartmentChange} />
					)
				}
				multipleFilter={{
					label: t(`${key}.showing`),
					value: showingValues,
					options: showingOptions,
					onChange: setShowingValues,
					placeholder: t(`${key}.showingEverything`),
				}}
				onSearchChange={setSearch}
				onClearFilters={() => {
					onDepartmentChange(undefined);
					setShowingValues([]);
				}}
				onCreate={
					canCreate
						? (): void => {
								openAdd();
							}
						: undefined
				}
			/>
			{readiness.status === "ready" && (
				<ReadinessCallout
					className="mt-6"
					department={units.department}
					returnTo={returnTo}
					rows={readiness.rows}
					view="constraints"
					onChooseDepartment={onDepartmentChange}
				/>
			)}
			{list.status === "ready" ? (
				<div className="mt-8 flex flex-col gap-8">
					{(laidOut.needingAttention.length > 0 || attentionOutside > 0) && (
						<Callout tone="error">
							{laidOut.needingAttention.length > 0 &&
								t(`${key}.attention`, {
									count: laidOut.needingAttention.length,
								})}{" "}
							{laidOut.needingAttention.map((constraint, index) => (
								<span key={constraint.constraintId}>
									{index > 0 && " · "}
									<Button
										variant="textlink"
										onClick={() => {
											showRow(constraint);
										}}
									>
										{constraint.name}
									</Button>
								</span>
							))}
							{attentionOutside > 0 && (
								<span className="block">
									{t(`${key}.attentionOutside`, { count: attentionOutside })}
								</span>
							)}
						</Callout>
					)}
					{shownRows.length > 0 && (
						<div className="flex justify-end gap-6">
							<Button
								variant="textlink"
								onClick={() => {
									folds.closeAll(sectionKeys);
								}}
							>
								{t(`${key}.collapseAll`)}
							</Button>
							<Button variant="textlink" onClick={folds.openAll}>
								{t(`${key}.expandAll`)}
							</Button>
						</div>
					)}
					{shownRows.length === 0 &&
					(search.trim() || showingValues.length > 0) ? (
						<p className="text-sm text-neutral-700">{t(`${key}.noMatch`)}</p>
					) : (
						<>
							{laidOut.sections.every(
								(section) => section.rows.length === 0
							) && (
								<p className="text-sm text-neutral-700">
									{t(`${key}.emptyGuide`)}
								</p>
							)}
							{laidOut.sections.map((section) => (
								<ConstraintSection
									key={section.category}
									count={section.rows.length}
									emptyText={t(`${key}.sectionEmpty`)}
									icon={categoryIconOf(section.category)}
									add={
										canCreate
											? {
													label: t(`${key}.addInSection`),
													onAdd: (): void => {
														openAdd(section.category);
													},
												}
											: undefined
									}
									collapse={{
										open: folds.isOpen(section.category),
										onToggle: () => {
											folds.toggle(section.category);
										},
										gist: gistOf(section.rows),
									}}
									description={t(
										`scheduling.constraints.categoryDescriptions.${section.category}`
									)}
									title={t(
										`scheduling.constraints.categories.${section.category}`
									)}
								>
									{section.rows.map(rowOf)}
								</ConstraintSection>
							))}
							{laidOut.company.length > 0 && (
								<ConstraintSection
									count={laidOut.company.length}
									description={t(`${key}.companyDescription`)}
									icon={LockIcon}
									title={t(`${key}.companyTitle`)}
									collapse={{
										open: folds.isOpen(COMPANY_SECTION),
										onToggle: () => {
											folds.toggle(COMPANY_SECTION);
										},
										gist: t(`${key}.companySummary`, {
											count: laidOut.company.length,
										}),
									}}
								>
									{laidOut.company.map(rowOf)}
								</ConstraintSection>
							)}
						</>
					)}
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
					startAt={dialog.kind === "add" ? dialog.startAt : undefined}
					department={
						dialog.kind === "add"
							? {
									kind: "choose",
									companyId,
									branchId: units.branch?.branchId,
									keys: CREATE_KEYS,
									value: dialog.departmentId,
									onChange: (departmentId): void => {
										setDialog({ ...dialog, departmentId });
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
