import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { mondayOf } from "@/common/weeks";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ExpandableList } from "@/components/ui/ExpandableList";
import { FillShiftsIcon } from "@/components/ui/Icon";
import type { Shortage } from "@/features/dashboard/api";
import {
	failedLineClasses,
	HOME_ROW_COUNT,
	rowAsideClasses,
	rowClasses,
	rowDetailClasses,
	rowLeadClasses,
	rowListClasses,
	rowTextClasses,
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
	/** Which of a rule's two pages the reader can open; both when left out. */
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
 * A rule too few people can staff, on one line: what it needs, how many
 * people hold its job titles, and how many shifts that leaves short. Its
 * one action is the rule itself, where the reader can open it, or else the
 * department's people.
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
			<span className={rowTextClasses}>
				<span className={rowLeadClasses}>{rule.ruleName}</span>
				{" · "}
				{t(`${key}.ruleNeeds`, {
					needed: rule.headcount,
					count: rule.peopleWithTitles,
				})}
				{" · "}
				{t(`${key}.ruleShifts`, { count: shortShifts })}
			</span>
			{links.rule && (
				<Button
					aria-label={t(`${key}.editRuleNamed`, { rule: rule.ruleName })}
					className="shrink-0"
					search={{ view: "constraints", department: rule.departmentId }}
					to="/scheduling"
					variant="textlink"
				>
					{t(`${key}.editRule`)}
				</Button>
			)}
			{!links.rule && links.people && (
				<Button
					className="shrink-0"
					search={{ department: rule.departmentId }}
					to="/people"
					variant="textlink"
					aria-label={t(`${key}.seePeopleNamed`, {
						department: rule.departmentName,
					})}
				>
					{t(`${key}.seePeople`)}
				</Button>
			)}
		</>
	);
};

/** One gap to cover, on one line; its action opens its roster on that week and day with Find cover for the shift. */
const GapRow = ({ shortage }: { shortage: Shortage }): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const day = formatDay(shortage.day, formattingLocale(i18n));
	return (
		<>
			<span className={rowTextClasses}>
				<span className={rowLeadClasses}>{shortage.shiftName}</span>
				{" · "}
				{day}
				{" · "}
				{shortage.departmentName}
				{shortage.shortBy > 1 &&
					` · ${t(`${key}.shortBy`, { count: shortage.shortBy })}`}
			</span>
			<Button
				className="shrink-0"
				params={{ scheduleId: shortage.scheduleId }}
				to="/scheduling/$scheduleId"
				variant="textlink"
				aria-label={t(`${key}.findCoverNamed`, {
					shift: shortage.shiftName,
					day,
				})}
				search={{
					week: mondayOf(shortage.day),
					day: shortage.day,
					cover: coverParameter(shortage),
				}}
			>
				{t(`${key}.findCover`)}
			</Button>
		</>
	);
};

/**
 * The shifts short this week and next, by cause, a line each. A rule too
 * few people can staff is named once, with what it needs; every other
 * short shift is a gap whose action opens Find cover on its roster. Shown
 * only where rosters may be read.
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
			action={
				// The days the list covers, beside the title; a narrower list says its own under it.
				heading ? undefined : (
					<span className={rowAsideClasses}>{t(`${key}.range`)}</span>
				)
			}
		>
			{heading && <p className={rowDetailClasses}>{heading.range}</p>}
			{shortShifts.status === "error" && (
				<p className={failedLineClasses} role="alert">
					{t(`${key}.failed`)}
				</p>
			)}
			{shortShifts.status === "ready" && (
				<ExpandableList
					collapsedCount={HOME_ROW_COUNT}
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
