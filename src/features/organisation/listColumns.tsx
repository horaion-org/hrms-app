import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { matchesSearch } from "@/common/matchesSearch";
import { isDecisionEngineStale } from "@/common/problem";
import { formatDate } from "@/components/forms/Calendar";
import type { SelectOption } from "@/components/forms/Select";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { EditIcon } from "@/components/ui/Icon";
import { OverflowMenu } from "@/components/ui/OverflowMenu";
import type { UnitStatus } from "@/features/organisation/api";
import type { OrganisationList } from "@/features/organisation/useOrganisationList";
import type { FilterChip } from "@/components/ui/FilterChips";
import { filterChip } from "@/features/workspace/filterChips";

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

/** The "Showing" chip while one status is chosen; none for every status. */
export const statusFilterChips = (
	t: TFunction,
	status: StatusFilter,
	onRemove: () => void
): Array<FilterChip> =>
	status === "all"
		? []
		: [
				filterChip(
					"status",
					t("organisation.list.showing"),
					t(`organisation.status.${status}`),
					onRemove,
					t
				),
			];

/**
 * The bold, sortable first column naming each row. `detail` adds a muted
 * second line under the name, cut to one line with the full text on hover;
 * rows without it stay one line.
 */
export const nameColumn = <T extends { name: string }>(
	header: string,
	detail?: (row: T) => string | null
): DataTableColumn<T> => ({
	id: "name",
	header,
	cell: (row): ReactNode => {
		const text = detail?.(row);
		if (!text) return row.name;
		return (
			<>
				<span className="block">{row.name}</span>
				<span
					className="block truncate font-normal text-neutral-700"
					title={text}
				>
					{text}
				</span>
			</>
		);
	},
	sortValue: (row) => row.name,
	cellClassName: "font-semibold",
	pin: "start",
});

/** The Branch each row belongs to, by name; left out below `md`, like every column but name, status and actions. */
export const branchColumn = <T extends { branchName?: string | null }>(
	t: TFunction
): DataTableColumn<T> => ({
	id: "branch",
	header: t("organisation.list.branch"),
	cell: (row) => row.branchName ?? "",
	hideBelow: "md",
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
 * When each row was created, as a date in the viewer's own time zone ("4 Nov
 * 2026"), with the exact time on hover. Its id is the API's sort field, so
 * sorting by it asks the server.
 */
export const createdColumn = <T extends { createdAt?: string }>(
	t: TFunction,
	language: string
): DataTableColumn<T> => ({
	id: "createdAt",
	header: t("organisation.list.created"),
	cell: (row) =>
		row.createdAt ? (
			<time
				dateTime={row.createdAt}
				title={new Intl.DateTimeFormat(language, {
					dateStyle: "medium",
					timeStyle: "short",
				}).format(new Date(row.createdAt))}
			>
				{formatDate(row.createdAt, language)}
			</time>
		) : null,
	// Named on the line for the eye; screen readers already hear the header.
	summary: (row) =>
		row.createdAt ? (
			<span>
				<span aria-hidden="true">{t("organisation.list.created")} </span>
				{formatDate(row.createdAt, language)}
			</span>
		) : null,
	sortValue: (row) => row.createdAt ?? "",
	// Left out on phones, which keep the columns that identify a row; the date joins the name's line.
	hideBelow: "md",
	headerClassName: "w-36",
});

/**
 * Each row's Edit button and "More actions" menu. Every Edit button must
 * provide its permission check and action; `menu` decides which items to offer.
 */
export const actionsColumn = <T extends { name: string }>(
	t: TFunction,
	menu: (row: T) => ReactNode,
	canEdit: (row: T) => boolean,
	onEdit: (row: T) => void
): DataTableColumn<T> => ({
	id: "actions",
	header: t("organisation.list.actions"),
	cell: (row) => (
		<div className="flex items-center justify-center gap-2">
			<Button
				aria-label={t("organisation.list.edit", { name: row.name })}
				disabled={!canEdit(row)}
				variant="icon"
				onClick={() => {
					onEdit(row);
				}}
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
	pin: "end",
});

/** What a list page shows for a list's state. */
export type ListView<T> = {
	rows: Array<T>;
	/** Shown in the table body when `rows` is empty. */
	empty: string;
	/** Replaces the table when the list can't be shown; `retry` when reading it again may help. */
	problem?: { message: string; alert: boolean; retry?: () => void };
	/** Set when the API holds more rows than one page returns. */
	truncated?: string;
	/** Shown above the rows while a re-read waits on an access update. */
	updating?: string;
};

const NO_ROWS: Array<never> = [];

/**
 * A failed read shown in place of its table: the access-update wording
 * when the API refused it as stale (`stillUpdating`), else `failed`, with
 * Try again reading it again either way.
 */
export const failedReadProblem = (
	read: { error: unknown; refetch: () => Promise<unknown> },
	failed: string,
	t: TFunction
): NonNullable<ListView<never>["problem"]> => ({
	message: isDecisionEngineStale(read.error)
		? t("organisation.list.stillUpdating")
		: failed,
	alert: true,
	retry: (): void => {
		void read.refetch();
	},
});

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
			return {
				rows: NO_ROWS,
				empty: list.stillUpdating
					? t("organisation.list.waitingForAccess")
					: t("organisation.list.loading"),
			};
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
				problem: {
					message: list.stillUpdating
						? t("organisation.list.stillUpdating")
						: t("organisation.list.failed"),
					alert: true,
					retry: list.retry,
				},
			};
		case "ready": {
			// Unfiltered rows keep their identity, so the table keeps its models.
			const rows = search.trim()
				? list.items.filter((row) => matches(row, search))
				: list.items;
			return {
				rows,
				updating: list.stillUpdating
					? t("organisation.list.waitingForAccess")
					: undefined,
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
