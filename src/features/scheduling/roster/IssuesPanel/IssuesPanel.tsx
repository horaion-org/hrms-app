import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import {
	ISSUE_FILTERS,
	rowsOfFilter,
	type IssueFilter,
	type IssueRow,
} from "@/features/scheduling/roster/issueRows";
import { IssueListRow } from "./IssueListRow";

export type IssuesPanelProps = {
	rows: ReadonlyArray<IssueRow>;
	/** What a row opens to, inline under it. */
	bodyOf: (row: IssueRow) => ReactNode;
	/** The row open at first, such as the gap "Find cover" was pressed for; none without. */
	initiallyOpen?: string;
	/** Above the list: what a fix made in part says, and the fixes for several rows at once. */
	lead?: ReactNode;
	/** Under the list, such as the cover offers out. */
	information?: ReactNode;
};

const key = "scheduling.issues.panel";

/**
 * The Issues list: All / Must fix / If possible, then one row per issue
 * (`IssueListRow`), at most one open at a time, opening inline under itself.
 * "Nothing here." when a filter holds no row.
 */
export const IssuesPanel = ({
	rows,
	bodyOf,
	initiallyOpen,
	lead,
	information,
}: IssuesPanelProps): FunctionComponent => {
	const { t } = useTranslation();
	const [filter, setFilter] = useState<IssueFilter>("all");
	const [openKey, setOpenKey] = useState(initiallyOpen);
	const shown = rowsOfFilter(rows, filter);
	const list = useRef<HTMLDivElement>(null);
	// A row fixed and checked away takes focus with it: it goes to the panel's heading instead of being lost.
	const openRowGone =
		openKey !== undefined && !rows.some((row) => row.key === openKey);
	useEffect(() => {
		if (!openRowGone || document.activeElement !== document.body) return;
		list.current
			?.closest("aside")
			?.querySelector<HTMLElement>("h2")
			?.focus();
	}, [openRowGone]);
	return (
		<div ref={list} className="flex flex-col gap-3">
			<div
				aria-label={t(`${key}.filtersLabel`)}
				className="flex gap-4"
				role="group"
			>
				{/* As Issues' order switch was: text links, the choice marked by weight and underline, not colour alone. */}
				{ISSUE_FILTERS.map((option) => (
					<Button
						key={option}
						aria-pressed={filter === option}
						variant="textlink"
						className={
							filter === option
								? "font-medium underline underline-offset-4"
								: undefined
						}
						onClick={(): void => {
							setFilter(option);
						}}
					>
						{t(`${key}.filters.${option}`)}
					</Button>
				))}
			</div>
			{lead}
			{shown.length === 0 ? (
				<p className="py-4 text-center text-sm text-neutral-700">
					{t(`${key}.nothingHere`)}
				</p>
			) : (
				<ul className="flex flex-col">
					{shown.map((row) => (
						<IssueListRow
							key={row.key}
							open={openKey === row.key}
							row={row}
							onToggle={(): void => {
								setOpenKey(openKey === row.key ? undefined : row.key);
							}}
						>
							{bodyOf(row)}
						</IssueListRow>
					))}
				</ul>
			)}
			{information}
		</div>
	);
};
