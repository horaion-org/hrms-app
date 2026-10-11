import type { TFunction } from "i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { EditIcon, ViewIcon } from "@/components/ui/Icon";
import { statusColumn } from "@/features/organisation/listColumns";
import type { MemberProfile } from "@/features/people/api";
import { ContactCell } from "@/features/people/ContactCell";
import { PersonCell } from "@/features/people/PersonCell";
import { profileEditAccess } from "@/features/people/profileEditAccess";
import type { PeopleList } from "@/features/people/usePeople";
import type { CanAt } from "@/features/workspace/scopes";

/**
 * The People table's columns. Each sortable column's id is the API's sort
 * field, so a header's sort goes to the server as it is. Every row can be
 * viewed (the API lists only readable rows); `can` decides which can be
 * edited, each row by where it is filed, since read and update may be
 * granted at different places.
 */
export const peopleColumns = (
	t: TFunction,
	can: CanAt
): Array<DataTableColumn<MemberProfile>> => [
	{
		id: "displayName",
		header: t("people.employee"),
		cell: (person) => (
			<PersonCell
				employeeCode={person.employeeCode}
				membershipId={person.membershipId}
				name={person.displayName}
			/>
		),
		sortValue: (person) => person.displayName,
		headerClassName: "w-1/4",
	},
	{
		id: "department",
		header: t("people.department"),
		cell: (person) => person.departmentName ?? t("people.notSet"),
		sortValue: (person) => person.departmentName ?? "",
	},
	{
		id: "jobTitle",
		header: t("people.jobTitle"),
		cell: (person) => person.jobTitleName ?? t("people.notSet"),
		sortValue: (person) => person.jobTitleName ?? "",
	},
	{
		id: "contact",
		header: t("people.contact"),
		cell: (person) => <ContactCell email={person.email} phone={person.phone} />,
		headerClassName: "w-1/4",
	},
	statusColumn<MemberProfile>(t),
	{
		id: "actions",
		header: t("organisation.list.actions"),
		cell: (person): FunctionComponent => {
			const profile = { membershipId: person.membershipId };
			return (
				<div className="flex items-center gap-2">
					<Button
						aria-label={t("people.view", { name: person.displayName })}
						params={profile}
						to="/people/$membershipId"
						variant="icon"
					>
						<ViewIcon />
					</Button>
					{profileEditAccess(person, can) && (
						<Button
							params={profile}
							search={{ edit: true }}
							to="/people/$membershipId"
							variant="icon"
							aria-label={t("organisation.list.edit", {
								name: person.displayName,
							})}
						>
							<EditIcon />
						</Button>
					)}
				</div>
			);
		},
		headerClassName: "w-30",
	},
];

/** What the People page shows for the list's state. */
export type PeopleView = {
	rows: Array<MemberProfile>;
	/** How many people match in all, across every page. */
	total: number;
	/** Shown in the table body when `rows` is empty. */
	empty: string;
	/** Replaces the table when the list can't be shown. */
	problem?: { message: string; alert: boolean };
};

const NO_ROWS: Array<never> = [];

/**
 * The rows and copy for every state of the list. `filtered` says whether a
 * search or status filter is narrowing it, which decides the empty copy.
 */
export const describePeople = (
	list: PeopleList,
	filtered: boolean,
	t: TFunction
): PeopleView => {
	switch (list.status) {
		case "pending":
			return { rows: NO_ROWS, total: 0, empty: t("organisation.list.loading") };
		case "hidden":
			return {
				rows: NO_ROWS,
				total: 0,
				empty: t("people.empty"),
				problem: { message: t("organisation.list.forbidden"), alert: false },
			};
		case "error":
			return {
				rows: NO_ROWS,
				total: 0,
				empty: t("people.empty"),
				problem: { message: t("organisation.list.failed"), alert: true },
			};
		case "ready":
			return {
				rows: list.items,
				total: list.total,
				empty: filtered ? t("organisation.list.noMatches") : t("people.empty"),
			};
		default: {
			const exhaustive: never = list;
			return exhaustive;
		}
	}
};
