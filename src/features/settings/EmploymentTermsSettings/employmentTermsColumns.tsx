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
import { overtimeShort, weekLines } from "@/features/employmentTerms/summary";
import { termsFormValuesOf } from "@/features/employmentTerms/termsForm";
import { kindOf } from "@/features/employmentTerms/termsKinds";
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

/** The kinds a list row names with a pill; fixed weeks and the company's own read from their figures. */
const PILL_KINDS = ["SHIFT_WORK", "PART_TIME"] as const;

/** The terms' name, a pill for shift work or part-time, and the description. */
const termsCell = (
	terms: TermsOverviewItem,
	presets: TermsPresets | undefined,
	t: TFunction
): ReactNode => {
	const kind = kindOf(
		termsFormValuesOf(terms),
		presets?.presets ?? [],
		presets?.partTimeBelowMinutes ?? null
	);
	const pill = PILL_KINDS.find((each) => each === kind);
	return (
		<>
			<span className="flex flex-wrap items-center gap-2">
				{terms.name}
				{pill && <Badge>{t(`employmentTerms.kinds.${pill}`)}</Badge>}
			</span>
			{terms.description && (
				<span
					className="block truncate font-normal text-neutral-700"
					title={terms.description}
				>
					{terms.description}
				</span>
			)}
		</>
	);
};

/**
 * The employment terms list's columns: the terms with their kind and
 * description, the week and rest day, when overtime starts, how many people
 * hold them (and are scheduled onto them), the status, and, for someone who
 * may change terms, the row actions (Edit, and a menu to change the start
 * date, make default, activate or deactivate, or delete terms nobody holds).
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
		id: "week",
		header: t(`${key}.week`),
		cell: (terms) =>
			weekLines(terms, presets, t).map((line, index) => (
				<span
					key={line}
					className={index === 0 ? "block" : "block text-neutral-700"}
				>
					{line}
				</span>
			)),
		// A phone keeps the terms and the actions as columns; the rest reads on the name's line, as Job titles does.
		summary: (terms) => weekLines(terms, presets, t).join(" · "),
		hideBelow: "md",
	},
	{
		id: "overtime",
		header: t(`${key}.overtime`),
		cell: (terms) => overtimeShort(terms, presets, t),
		hideBelow: "md",
	},
	{
		id: "people",
		header: t(`${key}.people`),
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
		headerClassName: "w-40",
		sortValue: (terms) => terms.status,
		cell: (terms) => statusCell(terms, t),
		hideBelow: "md",
	},
	...(canUpdate
		? [
				actionsColumn<TermsOverviewItem>(
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
			]
		: []),
];
