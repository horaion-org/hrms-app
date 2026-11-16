import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChevronDownIcon } from "@/components/ui/Icon";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import {
	ISSUE_GROUPS,
	issueCounts,
	issuesOfGroup,
	type IssueGroup,
	type IssueOrder,
	type RosterIssue,
} from "@/features/scheduling/roster/rosterIssueGroups";

const key = "scheduling.issues";

/** Each group's tone, in the header summary and on its heading. */
const GROUP_TONES: Record<IssueGroup, BadgeTone> = {
	mustFix: "error",
	notMet: "warning",
	forInformation: "neutral",
};

const ORDERS: ReadonlyArray<IssueOrder> = ["byPerson", "byDay"];

export type RosterIssueGroupsProps = {
	issues: ReadonlyArray<RosterIssue>;
	/** The validation result card, under the summary. */
	validationNote?: ReactNode;
	/** Outlines the item's cell on the grid. */
	onShow: (issue: RosterIssue) => void;
	onFindCover: (gap: CoverGapRequest) => void;
};

type IssueRowProps = {
	issue: RosterIssue;
	language: string;
	onShow: (issue: RosterIssue) => void;
	onFindCover: (gap: CoverGapRequest) => void;
};

/** Person first, then the day and time and the rule, with its one action on the right. */
const IssueRow = ({
	issue,
	language,
	onShow,
	onFindCover,
}: IssueRowProps): FunctionComponent => {
	const { t } = useTranslation();
	const { action } = issue;
	const when = [
		issue.day ? formatDay(issue.day, language) : undefined,
		issue.time ?? undefined,
	]
		.filter(Boolean)
		.join(" · ");
	return (
		<li className="flex items-start justify-between gap-3 py-2">
			<div className="flex min-w-0 flex-col">
				<span className="text-sm font-semibold text-neutral-900">
					{issue.who}
				</span>
				{when ? <span className="text-sm text-neutral-700">{when}</span> : null}
				<span className="text-sm text-neutral-700">{issue.rule}</span>
			</div>
			<Button
				variant="textlink"
				onClick={(): void => {
					if (action.kind === "findCover") onFindCover(action.gap);
					else onShow(issue);
				}}
			>
				{t(
					action.kind === "findCover"
						? "scheduling.cover.findCover"
						: `${key}.show`
				)}
			</Button>
		</li>
	);
};

type IssueGroupSectionProps = Omit<
	RosterIssueGroupsProps,
	"issues" | "validationNote"
> & {
	group: IssueGroup;
	items: ReadonlyArray<RosterIssue>;
	language: string;
};

/** One group, foldable by its heading; folded, a one-line gist of who it names. */
const IssueGroupSection = ({
	group,
	items,
	language,
	onShow,
	onFindCover,
}: IssueGroupSectionProps): FunctionComponent => {
	const { t } = useTranslation();
	const [open, setOpen] = useState(true);
	const listId = useId();
	const gist = [...new Set(items.map((issue) => issue.who))].join(", ");
	return (
		<section className="flex flex-col border-t border-neutral-300 pt-2">
			<button
				aria-controls={listId}
				aria-expanded={open}
				className="group flex w-full cursor-pointer items-center justify-between gap-3 text-left text-sm font-semibold text-neutral-900"
				type="button"
				onClick={(): void => {
					setOpen((wasOpen) => !wasOpen);
				}}
			>
				<span className="flex items-center gap-2">
					{t(`${key}.groups.${group}`)}
					<Badge compact tone={GROUP_TONES[group]}>
						{String(items.length)}
					</Badge>
				</span>
				<ChevronDownIcon
					className={open ? "size-4 shrink-0 rotate-180" : "size-4 shrink-0"}
				/>
			</button>
			{open ? null : (
				<p className="truncate text-sm text-neutral-700">{gist}</p>
			)}
			<ul hidden={!open} id={listId}>
				{items.map((issue) => (
					<IssueRow
						key={issue.key}
						issue={issue}
						language={language}
						onFindCover={onFindCover}
						onShow={onShow}
					/>
				))}
			</ul>
		</section>
	);
};

/**
 * The Issues tab by what to do: the counts in each group's tone, the
 * validation result, then Must fix, Could not be met and For your
 * information, each foldable, ordered by person or by day.
 */
export const RosterIssueGroups = ({
	issues,
	validationNote,
	onShow,
	onFindCover,
}: RosterIssueGroupsProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const [order, setOrder] = useState<IssueOrder>("byPerson");
	const language = formattingLocale(i18n);
	const counts = issueCounts(issues);
	const groups = ISSUE_GROUPS.filter((group) => counts[group] > 0);
	return (
		<div className="flex flex-col gap-3">
			{groups.length > 0 ? (
				<p className="flex flex-wrap gap-2">
					{groups.map((group) => (
						<Badge key={group} tone={GROUP_TONES[group]}>
							{t(`${key}.summary.${group}`, { count: counts[group] })}
						</Badge>
					))}
				</p>
			) : null}
			{validationNote}
			{groups.length === 0 ? (
				<p className="text-sm text-neutral-700">{t(`${key}.nothingWrong`)}</p>
			) : (
				<>
					<div
						aria-label={t(`${key}.orderLabel`)}
						className="flex gap-2"
						role="group"
					>
						{ORDERS.map((option) => (
							<Button
								key={option}
								aria-pressed={order === option}
								size="sm"
								variant={order === option ? "primary" : "secondary"}
								onClick={(): void => {
									setOrder(option);
								}}
							>
								{t(`${key}.order.${option}`)}
							</Button>
						))}
					</div>
					{groups.map((group) => (
						<IssueGroupSection
							key={group}
							group={group}
							items={issuesOfGroup(issues, group, order)}
							language={language}
							onFindCover={onFindCover}
							onShow={onShow}
						/>
					))}
				</>
			)}
		</div>
	);
};
