import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { SegmentedBar } from "@/components/charts/bar/SegmentedBar";
import type { BadgeTone } from "@/components/ui/Badge";
import { Callout } from "@/components/ui/Callout";
import { KeyFigure, type KeyFigureChange } from "@/components/ui/KeyFigure";
import { failedLineClasses } from "@/features/dashboard/cardStyles";
import type { GuardedRead } from "@/features/dashboard/guardedRead";
import type { OverviewSection } from "@/features/dashboard/homeSections";
import {
	figureStandings,
	overviewHeadline,
	type Overview as OverviewData,
	type OverviewGrouping,
	type Standing,
} from "@/features/reports/overview";
import { OverviewUnitsTable } from "@/features/reports/OverviewUnitsTable";
import {
	ShortShiftsCard,
	type RuleLinks,
} from "@/features/dashboard/ShortShiftsCard";
import { STANDING_TONES } from "@/features/reports/standingTones";

const key = "reports.overview";

/** The figures' grid: one column on a phone, two from `sm`, and one row from `xl`, of four figures or of three; the figures of a row share its height. */
const figureGridClasses = "grid grid-cols-1 gap-4 sm:grid-cols-2";

export type OverviewProps = {
	overview: GuardedRead<OverviewData>;
	/** Whether the units compared are Branches or the Departments of one Branch. */
	grouping: OverviewGrouping;
	/** Whether the person keeps a section; a hidden one is left out. */
	shown: (section: OverviewSection) => boolean;
	/** Which of a rule's two links the reader can open; both when left out. */
	ruleLinks?: RuleLinks;
};

/**
 * Home's Overview, for someone who looks across units: is anything wrong,
 * where, how badly, and is it getting better or worse. A headline in words,
 * four figures each beside what it is compared with, every unit in a table
 * with the one to act on first, then the staffing rules too few people can
 * staff, which is the case for hiring or changing the rule.
 */
export const Overview = ({
	overview,
	grouping,
	shown,
	ruleLinks,
}: OverviewProps): FunctionComponent => {
	const { t } = useTranslation();
	if (overview.status === "hidden") return null;
	if (overview.status !== "ready")
		return overview.status === "pending" ? (
			<p className="text-sm text-neutral-700">{t(`${key}.loading`)}</p>
		) : (
			<p className={failedLineClasses} role="alert">
				{t(`${key}.failed`)}
			</p>
		);
	const data = overview.data;
	const { figures, units, causes, rostersInReach } = data;
	if (units.length === 0) return <Callout>{t(`${key}.empty`)}</Callout>;
	const standings = figureStandings(data);
	const statusOf = (
		standing: Standing
	): { tone: BadgeTone; label: string } => ({
		tone: STANDING_TONES[standing],
		label: t(`${key}.standings.${standing}`),
	});
	/** A figure's move against the figure before it; none when it did not move, which the comparison then says in words. */
	const changeOf = (
		now: number,
		before: number
	): KeyFigureChange | undefined => {
		if (now === before) return undefined;
		const direction = now > before ? "up" : "down";
		const amount = String(Math.abs(now - before));
		return {
			direction,
			amount,
			description: t(`${key}.change.${direction}`, { amount }),
		};
	};
	const shortChange = changeOf(figures.peopleShort, figures.peopleShortBefore);
	const changesChange = changeOf(figures.changes, figures.changesBefore);
	return (
		<div className="flex flex-col gap-6">
			{shown("overview-figures") && (
				<>
					<p className="max-w-4xl text-xl font-medium text-neutral-900">
						{overviewHeadline(data)
							.map((sentence) =>
								sentence.key === "restOnTrack"
									? t(
											`${key}.headline.restOnTrack.${grouping}`,
											sentence.values
										)
									: t(`${key}.headline.${sentence.key}`, sentence.values)
							)
							.join(" ")}
					</p>
					<div
						className={`${figureGridClasses} ${rostersInReach ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}
					>
						<KeyFigure
							change={shortChange}
							label={t(`${key}.figures.peopleShort.label`)}
							status={statusOf(standings.peopleShort)}
							unit={t(`${key}.figures.peopleShort.unit`)}
							value={String(figures.peopleShort)}
							comparison={t(
								`${key}.figures.peopleShort.${shortChange ? "comparison" : "comparisonSame"}`
							)}
						/>
						<KeyFigure
							label={t(`${key}.figures.overLimit.label`)}
							status={statusOf(standings.overLimit)}
							value={String(figures.overLimit)}
							comparison={t(`${key}.figures.overLimit.comparison`, {
								near: figures.nearLimit,
								before: figures.overLimitBefore,
							})}
							unit={t(`${key}.figures.overLimit.unit`, {
								count: figures.overLimit,
							})}
						/>
						{rostersInReach && (
							<KeyFigure
								label={t(`${key}.figures.published.label`)}
								status={statusOf(standings.published)}
								value={String(figures.published)}
								unit={t(`${key}.figures.published.unit`, {
									count: figures.rosters,
								})}
							>
								<SegmentedBar
									label={t(`${key}.figures.published.label`)}
									segments={[
										{
											id: "published",
											label: t(`${key}.units.published`),
											colour: "inkBlue900",
											value: figures.published,
										},
										{
											id: "toDo",
											label: t(`${key}.units.toDo`),
											colour: "neutral400",
											value: figures.rosters - figures.published,
										},
									]}
								/>
							</KeyFigure>
						)}
						<KeyFigure
							change={changesChange}
							label={t(`${key}.figures.changes.label`)}
							status={statusOf(standings.changes)}
							unit={t(`${key}.figures.changes.unit`)}
							value={String(figures.changes)}
							comparison={t(
								`${key}.figures.changes.${changesChange ? "comparison" : "comparisonSame"}`
							)}
						/>
					</div>
				</>
			)}
			{shown("overview-units") && (
				<OverviewUnitsTable
					grouping={grouping}
					rostersInReach={rostersInReach}
					units={units}
				/>
			)}
			{shown("overview-causes") &&
				(causes.length > 0 ? (
					<ShortShiftsCard
						ruleLinks={ruleLinks}
						heading={{
							title: t(`${key}.causes.title`),
							range: t(`${key}.causes.range`),
						}}
						shortShifts={{
							status: "ready",
							data: { unstaffable: causes, gaps: [] },
						}}
					/>
				) : (
					<Callout>{t(`${key}.causes.none`)}</Callout>
				))}
		</div>
	);
};
