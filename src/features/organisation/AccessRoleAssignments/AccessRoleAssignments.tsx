import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Token } from "@/components/forms/Combobox/Token";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PlusIcon } from "@/components/ui/Icon";
import { placeOf } from "@/features/organisation/AccessRoleAssignments/placeOf";

/** One person holding the role at one place. */
export type AccessRoleAssignmentRow = {
	assignmentId: string;
	membershipId: string;
	displayName: string;
	/** Set when the role applies at a Branch or one of its Departments, not the whole company. */
	branchName?: string;
	/** Set, with `branchName`, when the role applies at one Department. */
	departmentName?: string;
};

export type AccessRoleAssignmentsProps = {
	assignments: ReadonlyArray<AccessRoleAssignmentRow>;
	/** Left out when the person may not assign roles. */
	onAssign?: () => void;
	/** Left out when the person may not remove assignments. */
	onRemove?: (assignment: AccessRoleAssignmentRow) => void;
	className?: string;
};

/** A person and every place they hold the role. */
type Holder = {
	membershipId: string;
	displayName: string;
	places: Array<AccessRoleAssignmentRow>;
};

const key = "organisation.accessRoles.assignments";

const byHolder = (
	assignments: ReadonlyArray<AccessRoleAssignmentRow>
): Array<Holder> => {
	const holders = new Map<string, Holder>();
	for (const assignment of assignments) {
		const holder = holders.get(assignment.membershipId) ?? {
			membershipId: assignment.membershipId,
			displayName: assignment.displayName,
			places: [],
		};
		holder.places.push(assignment);
		holders.set(assignment.membershipId, holder);
	}
	return [...holders.values()];
};

/**
 * Who holds an access role and where it applies: one row per person, with
 * every place they hold it. Each place is removed on its own.
 */
export const AccessRoleAssignments = ({
	assignments,
	onAssign,
	onRemove,
	className,
}: AccessRoleAssignmentsProps): FunctionComponent => {
	const { t } = useTranslation();
	const holders = byHolder(assignments);
	const columns: Array<DataTableColumn<Holder>> = [
		{
			id: "person",
			header: t(`${key}.person`),
			cell: (holder) => (
				<span className="flex items-center gap-3">
					<Avatar className="size-9 text-sm" name={holder.displayName} />
					<span className="min-w-0 truncate font-semibold">
						{holder.displayName}
					</span>
				</span>
			),
			headerClassName: "w-80",
		},
		{
			id: "places",
			header: t(`${key}.appliesTo`),
			cell: (holder) => (
				<ul
					aria-label={t(`${key}.placesOf`, { name: holder.displayName })}
					className="flex flex-wrap gap-2 py-2"
				>
					{holder.places.map((place) => (
						<li key={place.assignmentId}>
							{onRemove ? (
								<Token
									label={placeOf(place, t)}
									onRemove={() => {
										onRemove(place);
									}}
								/>
							) : (
								placeOf(place, t)
							)}
						</li>
					))}
				</ul>
			),
		},
	];

	return (
		<section className={className}>
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-baseline gap-4">
					<h2 className="text-xl font-medium text-neutral-900">
						{t(`${key}.title`)}
					</h2>
					<p className="text-sm text-neutral-700">
						{t(`${key}.count`, { count: holders.length })}
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
				data={holders}
				emptyState={t(`${key}.empty`)}
				getRowId={(holder) => holder.membershipId}
				label={t(`${key}.label`)}
			/>
		</section>
	);
};
