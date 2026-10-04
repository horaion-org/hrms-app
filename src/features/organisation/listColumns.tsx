import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import type { SelectOption } from "@/components/forms/Select";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { EditIcon } from "@/components/ui/Icon";
import { OverflowMenu } from "@/components/ui/OverflowMenu";
import type { UnitStatus } from "@/features/organisation/api";
import type { OrganisationList } from "@/features/organisation/useOrganisationList";

/** The "Showing:" filter's choice: every row, or one status. */
export type StatusFilter = "all" | UnitStatus;

export const statusFilterOptions = (
	t: TFunction,
	allLabel: string
): Array<SelectOption> => [
	{ value: "all", label: allLabel },
	{ value: "ACTIVE", label: t("organisation.status.ACTIVE") },
	{ value: "INACTIVE", label: t("organisation.status.INACTIVE") },
];

export const isStatusFilter = (value: string): value is StatusFilter =>
	value === "all" || value === "ACTIVE" || value === "INACTIVE";

/** The bold, sortable first column naming each row. */
export const nameColumn = <T extends { name: string }>(
	header: string
): DataTableColumn<T> => ({
	id: "name",
	header,
	cell: (row) => row.name,
	sortValue: (row) => row.name,
	cellClassName: "font-semibold",
});

export const statusColumn = <T extends { status: UnitStatus }>(
	t: TFunction
): DataTableColumn<T> => ({
	id: "status",
	header: t("organisation.list.status"),
	cell: (row) => (
		<Badge tone={row.status === "ACTIVE" ? "success" : "neutral"}>
			{t(`organisation.status.${row.status}`)}
		</Badge>
	),
	sortValue: (row) => row.status,
	headerClassName: "w-30",
});

/**
 * Each row's Edit button and "More actions" menu. Editing is not built yet,
 * so the button does nothing and `menu` decides which items to offer.
 */
export const actionsColumn = <T extends { name: string }>(
	t: TFunction,
	menu: (row: T) => ReactNode,
	canEdit: (row: T) => boolean = (): boolean => true
): DataTableColumn<T> => ({
	id: "actions",
	header: t("organisation.list.actions"),
	cell: (row) => (
		<div className="flex items-center justify-center gap-2">
			<Button
				aria-label={t("organisation.list.edit", { name: row.name })}
				disabled={!canEdit(row)}
				variant="icon"
			>
				<EditIcon />
			</Button>
			<OverflowMenu
				label={t("organisation.list.moreActions", { name: row.name })}
				variant="icon"
			>
				{menu(row)}
			</OverflowMenu>
		</div>
	),
	headerClassName: "w-35",
	cellClassName: "px-0",
});

/** Whether a name contains the search, ignoring case and outer spaces. */
export const matchesSearch = (name: string, search: string): boolean =>
	name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());

/** What a list page shows for a list's state. */
export type ListView<T> = {
	rows: Array<T>;
	/** Shown in the table body when `rows` is empty. */
	empty: string;
	/** Replaces the table when the list can't be shown. */
	problem?: { message: string; alert: boolean };
	/** Set when the API holds more rows than one page returns. */
	truncated?: string;
};

const NO_ROWS: Array<never> = [];

/**
 * Turns a fetched list into rows filtered by the search, with the copy for
 * every state. `emptyText` is the list's own "No … yet." line.
 */
export const describeList = <T extends { name: string }>(
	list: OrganisationList<T>,
	search: string,
	filtered: boolean,
	emptyText: string,
	t: TFunction,
	matches: (row: T, search: string) => boolean = (row, query) =>
		matchesSearch(row.name, query)
): ListView<T> => {
	switch (list.status) {
		case "pending":
			return { rows: NO_ROWS, empty: t("organisation.list.loading") };
		case "hidden":
			return {
				rows: NO_ROWS,
				empty: emptyText,
				problem: { message: t("organisation.list.forbidden"), alert: false },
			};
		case "error":
			return {
				rows: NO_ROWS,
				empty: emptyText,
				problem: { message: t("organisation.list.failed"), alert: true },
			};
		case "ready": {
			// Unfiltered rows keep their identity, so the table keeps its models.
			const rows = search.trim()
				? list.items.filter((row) => matches(row, search))
				: list.items;
			return {
				rows,
				empty:
					search.trim() || filtered
						? t("organisation.list.noMatches")
						: emptyText,
				truncated:
					list.total > list.items.length
						? t("organisation.list.truncated", {
								shown: list.items.length,
								total: list.total,
							})
						: undefined,
			};
		}
		default: {
			const exhaustive: never = list;
			return exhaustive;
		}
	}
};
