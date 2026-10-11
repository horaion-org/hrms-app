import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Token } from "@/components/forms/Combobox/Token";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PlusIcon } from "@/components/ui/Icon";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { UnitStatus } from "@/features/organisation/api";
import { placeOf } from "@/features/organisation/assignmentTargets";
import {
	actionsColumn,
	statusColumn,
} from "@/features/organisation/listColumns";

/** One person holding the role at one place. */
export type AccessRoleAssignmentRow = {
	assignmentId: string;
	membershipId: string;
	/** The person's display name. */
	name: string;
	/** An inactive assignment is kept but gives the person nothing until it is activated again. */
	status: UnitStatus;
	/** Set, with `branchName`, when the role applies at a Branch or one of its Departments, not the whole company. */
	branchId?: string;
	branchName?: string;
	/** Set, with `departmentName`, when the role applies at one Department. */
	departmentId?: string;
	departmentName?: string;
};

/** A person and every place they hold the role. */
export type AccessRolePerson = {
	membershipId: string;
	name: string;
	/** Inactive only when the role is switched off for them at every place. */
	status: UnitStatus;
	places: Array<AccessRoleAssignmentRow>;
};

export type AccessRoleAssignmentsProps = {
	assignments: ReadonlyArray<AccessRoleAssignmentRow>;
	/** Left out when the person may not assign roles. */
	onAssign?: () => void;
	/**
	 * Changing where one person has the role, switching it off or on for
	 * them, and removing it from them altogether. Left out together, and the
	 * actions column with them, when the person may not change assignments.
	 */
	onEdit?: (person: AccessRolePerson) => void;
	onSetStatus?: (person: AccessRolePerson) => void;
	onRemove?: (person: AccessRolePerson) => void;
	/**
	 * Whether the person may change any of this row's assignments: each is
	 * checked at its own place, so a row whose places are all out of reach
	 * has its actions disabled. All rows by default.
	 */
	canChange?: (person: AccessRolePerson) => boolean;
	className?: string;
};

const key = "organisation.accessRoles.assignments";

const byPerson = (
	assignments: ReadonlyArray<AccessRoleAssignmentRow>
): Array<AccessRolePerson> => {
	const people = new Map<string, AccessRolePerson>();
	for (const assignment of assignments) {
		const person = people.get(assignment.membershipId) ?? {
			membershipId: assignment.membershipId,
			name: assignment.name,
			status: assignment.status,
			places: [],
		};
		if (assignment.status === "ACTIVE") person.status = "ACTIVE";
		person.places.push(assignment);
		people.set(assignment.membershipId, person);
	}
	return [...people.values()];
};

/**
 * Who holds an access role and where it applies: one row per person with
 * every place they hold it, their status, and the same Edit and "More
 * actions" as the other Organisation lists.
 */
export const AccessRoleAssignments = ({
	assignments,
	onAssign,
	onEdit,
	onSetStatus,
	onRemove,
	canChange = (): boolean => true,
	className,
}: AccessRoleAssignmentsProps): FunctionComponent => {
	const { t } = useTranslation();
	const people = byPerson(assignments);
	const columns: Array<DataTableColumn<AccessRolePerson>> = [
		{
			id: "person",
			header: t(`${key}.person`),
			cell: (person) => (
				<span className="flex items-center gap-3">
					<Avatar className="size-9 text-sm" name={person.name} />
					<span className="min-w-0 truncate font-semibold">{person.name}</span>
				</span>
			),
			headerClassName: "w-80",
		},
		{
			id: "places",
			header: t(`${key}.appliesTo`),
			cell: (person) => (
				<ul
					aria-label={t(`${key}.placesOf`, { name: person.name })}
					className="flex flex-wrap gap-2 py-2"
				>
					{person.places.map((place) => (
						<li key={place.assignmentId}>
							<Token label={placeOf(place, t)} />
						</li>
					))}
				</ul>
			),
		},
		statusColumn<AccessRolePerson>(t),
	];
	if (onEdit && onSetStatus && onRemove)
		columns.push(
			actionsColumn<AccessRolePerson>(
				t,
				(person) => (
					<>
						<OverflowMenuItem
							disabled={!canChange(person)}
							onClick={() => {
								onSetStatus(person);
							}}
						>
							{t(
								person.status === "ACTIVE"
									? "organisation.list.deactivateItem"
									: "organisation.list.activateItem"
							)}
						</OverflowMenuItem>
						<OverflowMenuItem
							disabled={!canChange(person)}
							onClick={() => {
								onRemove(person);
							}}
						>
							{t("organisation.list.deleteItem")}
						</OverflowMenuItem>
					</>
				),
				// Places are changed while the role is on for the person; activate it first.
				(person) => person.status === "ACTIVE" && canChange(person),
				onEdit
			)
		);

	return (
		<section className={className}>
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-baseline gap-4">
					<h2 className="text-xl font-medium text-neutral-900">
						{t(`${key}.title`)}
					</h2>
					<p className="text-sm text-neutral-700">
						{t(`${key}.count`, { count: people.length })}
					</p>
				</div>
				{onAssign && (
					<Button leadingIcon={<PlusIcon />} size="sm" onClick={onAssign}>
						{t(`${key}.assign`)}
					</Button>
				)}
			</div>
			<DataTable
				className="mt-4"
				columns={columns}
				data={people}
				emptyState={t(`${key}.empty`)}
				getRowId={(person) => person.membershipId}
				label={t(`${key}.label`)}
			/>
		</section>
	);
};
