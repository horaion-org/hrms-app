import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type {
	TermsOverviewItem,
	TermsPresets,
} from "@/features/employmentTerms/api";
import {
	isPartTimeWeek,
	overtimeShort,
	weekLines,
} from "@/features/employmentTerms/summary";
import { actionsColumn } from "@/features/organisation/listColumns";
import { ALL_BRANCHES } from "@/features/workspace/unitSelection";

const key = "employmentTerms.panel";

/** A row menu choice that asks for confirmation first. */
export type TermsRowAction = {
	kind: "status" | "default" | "delete";
	terms: TermsOverviewItem;
};

export type EmploymentTermsColumnsOptions = {
	/** The API's figures and common weeks, to name each terms' kind and when overtime starts; undefined until loaded. */
	presets: TermsPresets | undefined;
	/** Whether the reader may change terms (`employment_terms:update`); without it there are no row actions. */
	canUpdate: boolean;
	/** Whether each count links to the People list (people and their terms readable company-wide). */
	canListHolders: boolean;
	onEdit: (terms: TermsOverviewItem) => void;
	/** Edit, opened at the date the new terms start from. */
	onChangeFromDate: (terms: TermsOverviewItem) => void;
	onRowAction: (action: TermsRowAction) => void;
};

/** The status cell: Active or Inactive, and Default on the one people without terms follow. */
const statusCell = (terms: TermsOverviewItem, t: TFunction): ReactNode => (
	<span className="flex flex-wrap items-center gap-2">
		<Badge tone={terms.status === "ACTIVE" ? "success" : "neutral"}>
			{terms.status === "UNKNOWN"
				? t("organisation.skills.statusUnknown")
				: t(`organisation.status.${terms.status}`)}
		</Badge>
		{terms.isDefault && <Badge>{t(`${key}.default`)}</Badge>}
	</span>
);

/**
 * The terms in full, so the list reads in the width Settings gives it: the
 * name with a pill for shift work or part-time, the week and rest day on one
 * line, when overtime starts on the next, then the description.
 */
const termsCell = (
	terms: TermsOverviewItem,
	presets: TermsPresets | undefined,
	t: TFunction
): ReactNode => {
	const partTime = isPartTimeWeek(
		terms.weekMinutes,
		presets?.partTimeBelowMinutes ?? null
	);
	const overtime = overtimeShort(terms, presets, t);
	return (
		<span className="flex flex-col gap-1">
			<span className="flex flex-wrap items-center gap-2">
				{terms.name}
				{partTime && (
					<Badge>{t("employmentTerms.dialog.partTimeBadge")}</Badge>
				)}
			</span>
			<span className="font-normal text-neutral-900">
				{weekLines(terms, presets, t).join(" · ")}
			</span>
			{overtime && (
				<span className="font-normal text-neutral-800">{overtime}</span>
			)}
			{terms.description && (
				<span className="font-normal text-neutral-700">
					{terms.description}
				</span>
			)}
		</span>
	);
};

/**
 * The employment terms list's columns, few so they fit beside the Settings
 * menu: the terms in full (kind, week, rest day, overtime, description), how
 * many people hold them (and are scheduled onto them), the status, and, for
 * someone who may change terms, the row actions (Edit, and a menu to change
 * the start date, make default, activate or deactivate, or delete terms
 * nobody holds). On a phone the people and status read on the name's line.
 */
export const employmentTermsColumns = (
	t: TFunction,
	{
		presets,
		canUpdate,
		canListHolders,
		onEdit,
		onChangeFromDate,
		onRowAction,
	}: EmploymentTermsColumnsOptions
): Array<DataTableColumn<TermsOverviewItem>> => [
	{
		id: "name",
		header: t(`${key}.terms`),
		cell: (terms) => termsCell(terms, presets, t),
		sortValue: (terms) => terms.name,
		cellClassName: "font-semibold",
		pin: "start",
	},
	{
		id: "people",
		header: t(`${key}.people`),
		// The terms column takes the room; the counts, status and actions keep to their content.
		// A sortable header needs its text plus about 70 px (padding, gap and the sort button at
		// its touch size): 144 px holds "Personas" (about 64 px), the wider of English and Spanish.
		headerClassName: "w-36",
		sortValue: (terms) => terms.holderCount,
		hideBelow: "md",
		cell: (terms) => (
			<>
				{canListHolders && terms.holderCount > 0 ? (
					<span className="block">
						<Button
							aria-label={t(`${key}.peopleLink`, { name: terms.name })}
							search={{ branch: ALL_BRANCHES, terms: terms.id }}
							to="/people"
							variant="textlink"
						>
							{t(`${key}.peopleCount`, { count: terms.holderCount })}
						</Button>
					</span>
				) : (
					<span
						className={
							terms.holderCount === 0 ? "block text-neutral-700" : "block"
						}
					>
						{t(`${key}.peopleCount`, { count: terms.holderCount })}
					</span>
				)}
				{terms.scheduledCount > 0 && (
					<span className="block text-neutral-700">
						{t(`${key}.scheduledCount`, { count: terms.scheduledCount })}
					</span>
				)}
			</>
		),
	},
	{
		id: "status",
		header: t("organisation.list.status"),
		// 176 px holds the widest pill, Spanish "Predeterminadas" (about 136 px with its padding), with room
		// to spare; Active and Default share a line where they fit and wrap where they do not.
		headerClassName: "w-44",
		sortValue: (terms) => terms.status,
		cell: (terms) => statusCell(terms, t),
		hideBelow: "md",
	},
	...(canUpdate
		? [
				{
					...actionsColumn<TermsOverviewItem>(
						t,
						(terms) => (
							<>
								<OverflowMenuItem
									disabled={terms.status !== "ACTIVE"}
									onClick={() => {
										onChangeFromDate(terms);
									}}
								>
									{t(`${key}.menu.changeFromDate`)}
								</OverflowMenuItem>
								<OverflowMenuItem
									disabled={terms.isDefault || terms.status !== "ACTIVE"}
									onClick={() => {
										onRowAction({ kind: "default", terms });
									}}
								>
									{t(`${key}.menu.makeDefault`)}
								</OverflowMenuItem>
								<OverflowMenuItem
									disabled={terms.isDefault || terms.status === "UNKNOWN"}
									onClick={() => {
										onRowAction({ kind: "status", terms });
									}}
								>
									{t(
										terms.status === "INACTIVE"
											? "organisation.list.activateItem"
											: "organisation.list.deactivateItem"
									)}
								</OverflowMenuItem>
								{terms.holderCount + terms.scheduledCount === 0 &&
									!terms.isDefault && (
										<OverflowMenuItem
											onClick={() => {
												onRowAction({ kind: "delete", terms });
											}}
										>
											{t("organisation.list.deleteItem")}
										</OverflowMenuItem>
									)}
							</>
						),
						(terms) => terms.status !== "UNKNOWN",
						(terms) => {
							onEdit(terms);
						}
					),
					// Two icons need less than the shared 140 px.
					headerClassName: "w-24",
				},
			]
		: []),
];
