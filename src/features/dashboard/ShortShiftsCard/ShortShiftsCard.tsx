import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { mondayOf } from "@/common/weeks";
import { Card } from "@/components/ui/Card";
import { ExpandableList } from "@/components/ui/ExpandableList";
import { FillShiftsIcon } from "@/components/ui/Icon";
import type { Shortage } from "@/features/dashboard/api";
import {
	cardLinkClasses,
	failedLineClasses,
	rowClasses,
	rowDetailClasses,
	rowListClasses,
	rowTitleClasses,
} from "@/features/dashboard/cardStyles";
import type { GuardedRead } from "@/features/dashboard/guardedRead";
import type {
	ShortShiftsByCause,
	UnstaffableRule,
} from "@/features/dashboard/shortCauses";
import { coverParameter } from "@/features/scheduling/roster/rosterSearch";

const key = "dashboard.cards.shortShifts";

/** Whether the reader can open a rule's page and its department's people. */
export type RuleLinks = { rule: boolean; people: boolean };

const EVERY_RULE_LINK: RuleLinks = { rule: true, people: true };

/** One row of the card: a rule nobody can staff, or one gap to cover. */
type Row =
	| { kind: "rule"; id: string; unstaffable: UnstaffableRule }
	| { kind: "gap"; id: string; shortage: Shortage };

export type ShortShiftsCardProps = {
	/** The shifts short this week and next, by cause, most urgent first. */
	shortShifts: GuardedRead<ShortShiftsByCause>;
	/** The card's own words where it shows something narrower, such as only the rules nobody can staff. */
	heading?: { title: string; range: string };
	/** Which of a rule's two links the reader can open; both when left out. */
	ruleLinks?: RuleLinks;
	className?: string;
};

/** The rules nobody can staff first, each once, then the gaps to cover. */
const rowsOf = ({ unstaffable, gaps }: ShortShiftsByCause): Array<Row> => [
	...unstaffable.map((each): Row => ({
		kind: "rule",
		id: `rule|${each.rule.departmentId}|${each.rule.ruleName}`,
		unstaffable: each,
	})),
	...gaps.map((shortage): Row => ({
		kind: "gap",
		id: `gap|${shortage.scheduleId}|${shortage.shiftId}|${shortage.day}`,
		shortage,
	})),
];

/**
 * A rule too few people can staff, named once with its cause: what it
 * needs, how many people hold its job titles, and that cover cannot fix
 * it. It leads to the rule and to the department's people, each only where
 * the reader can open it.
 */
const UnstaffableRuleRow = ({
	unstaffable: { rule, shortShifts },
	links,
}: {
	unstaffable: UnstaffableRule;
	links: RuleLinks;
}): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<>
			<span className={rowTitleClasses}>
				{t(`${key}.rule`, {
					rule: rule.ruleName,
					department: rule.departmentName,
				})}
			</span>
			<span className={rowDetailClasses}>
				{t(`${key}.ruleCause`, {
					needed: rule.headcount,
					titles: rule.jobTitles.map((title) => title.name).join(", "),
					count: rule.peopleWithTitles,
				})}{" "}
				{t(`${key}.ruleShort`, { count: shortShifts })}
			</span>
			{(links.rule || links.people) && (
				<span className="flex flex-wrap gap-x-4 gap-y-1">
					{links.rule && (
						<Link
							className={cardLinkClasses}
							search={{ view: "constraints", department: rule.departmentId }}
							to="/scheduling"
						>
							{t(`${key}.editRule`)}
						</Link>
					)}
					{links.people && (
						<Link
							className={cardLinkClasses}
							search={{ department: rule.departmentId }}
							to="/people"
						>
							{t(`${key}.seePeople`, { department: rule.departmentName })}
						</Link>
					)}
				</span>
			)}
		</>
	);
};

/** One gap to cover: it opens its roster on that week and day with Find cover for the shift. */
const GapRow = ({ shortage }: { shortage: Shortage }): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	return (
		<>
			<Link
				className={cardLinkClasses}
				params={{ scheduleId: shortage.scheduleId }}
				to="/scheduling/$scheduleId"
				search={{
					week: mondayOf(shortage.day),
					day: shortage.day,
					cover: coverParameter(shortage),
				}}
			>
				{t(`${key}.shift`, {
					shift: shortage.shiftName,
					day: formatDay(shortage.day, language),
					start: shortage.startTime,
					end: shortage.endTime,
				})}
			</Link>
			<span className={rowDetailClasses}>
				{t(`${key}.detail`, {
					department: shortage.departmentName,
					count: shortage.shortBy,
				})}
			</span>
		</>
	);
};

/**
 * The shifts short this week and next, by cause. A rule too few people can
 * staff is named once, with what would fix it; every other short shift is
 * a gap that opens Find cover on its roster. Shown only where rosters may
 * be read.
 */
export const ShortShiftsCard = ({
	shortShifts,
	heading,
	ruleLinks = EVERY_RULE_LINK,
	className,
}: ShortShiftsCardProps): FunctionComponent => {
	const { t } = useTranslation();
	if (shortShifts.status === "hidden") return null;
	return (
		<Card
			className={className}
			icon={FillShiftsIcon}
			title={heading?.title ?? t(`${key}.title`)}
		>
			<p className={rowDetailClasses}>{heading?.range ?? t(`${key}.range`)}</p>
			{shortShifts.status === "error" && (
				<p className={failedLineClasses} role="alert">
					{t(`${key}.failed`)}
				</p>
			)}
			{shortShifts.status === "ready" && (
				<ExpandableList
					itemClassName={rowClasses}
					items={rowsOf(shortShifts.data)}
					keyOf={(row) => row.id}
					listClassName={rowListClasses}
					renderItem={(row) =>
						row.kind === "rule" ? (
							<UnstaffableRuleRow
								links={ruleLinks}
								unstaffable={row.unstaffable}
							/>
						) : (
							<GapRow shortage={row.shortage} />
						)
					}
				/>
			)}
		</Card>
	);
};
