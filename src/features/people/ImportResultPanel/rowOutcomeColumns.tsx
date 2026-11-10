import { Link } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import type { DataTableColumn } from "@/components/ui/DataTable";
import type { RowOutcome } from "@/features/people/import/api";
import {
	outcomeDetail,
	resolvedText,
} from "@/features/people/import/importText";

export type RowOutcomeColumnsOptions = {
	/** The locale a resolved row's date is written in. */
	locale: string;
	/** Some row names its person, so the person column shows. */
	showsPeople: boolean;
};

/**
 * A people import's result columns: the row number, its person (when any
 * row names one), what happened, and the detail with a link to the person
 * added, or added since.
 */
export const rowOutcomeColumns = (
	t: TFunction,
	{ locale, showsPeople }: RowOutcomeColumnsOptions
): Array<DataTableColumn<RowOutcome>> => {
	const columns: Array<DataTableColumn<RowOutcome>> = [
		{
			id: "row",
			header: t("people.importPage.result.rowColumn"),
			cell: (outcome) => outcome.rowNumber,
			headerClassName: "w-16",
		},
		{
			id: "person",
			header: t("people.importPage.result.nameColumn"),
			cell: (outcome) => outcome.name ?? outcome.email ?? "",
		},
		{
			id: "result",
			header: t("people.importPage.result.resultColumn"),
			cell: (outcome) =>
				resolvedText(outcome, t, locale) ??
				t(`people.importPage.results.${outcome.result}`),
		},
		{
			id: "detail",
			header: t("people.importPage.result.detailColumn"),
			cell: (outcome): ReactNode => {
				const linkedMembershipId =
					outcome.membershipId ?? outcome.resolvedMembershipId;
				return linkedMembershipId ? (
					<span className="flex flex-wrap gap-2">
						{!outcome.resolved && outcomeDetail(outcome, t)}
						<Link
							className="font-semibold text-ink-blue-700 underline"
							params={{ membershipId: linkedMembershipId }}
							to="/people/$membershipId"
						>
							{t("people.importPage.result.open")}
						</Link>
					</span>
				) : (
					!outcome.resolved && outcomeDetail(outcome, t)
				);
			},
		},
	];
	return showsPeople
		? columns
		: columns.filter((column) => column.id !== "person");
};
