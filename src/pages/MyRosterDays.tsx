import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { mondayOf } from "@/common/weeks";
import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";
import {
	stepWindow,
	windowFrom,
} from "@/features/scheduling/myRoster/myRosterDays";
import { formatPeriod } from "@/features/scheduling/periods";
import { windowDays } from "@/features/scheduling/timeline/timeline";
import { TimelineGrid } from "@/features/scheduling/timeline/TimelineGrid";
import { useMemberTimeline } from "@/features/scheduling/timeline/useMemberTimeline";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";

const route = getRouteApi("/_authenticated/_app/me/schedules/");

const key = "scheduling.myRoster.days";

/** The round previous and next buttons, as the week navigator draws them. */
const stepButtonClasses = "size-12! rounded-full! border border-neutral-500";

/** A line saying why the days aren't shown; an alert unless they are still loading. */
const Problem = ({
	alert,
	children,
}: {
	alert: boolean;
	children: string;
}): FunctionComponent => (
	<p className="text-sm text-neutral-800" role={alert ? "alert" : undefined}>
		{children}
	</p>
);

/** Shown in place of the page when its route fails. */
export const MyRosterDaysProblem = (): FunctionComponent => {
	const { t } = useTranslation();
	return <Problem alert>{t(`${key}.loadFailed`)}</Problem>;
};

/**
 * The person's department's published roster at `/me/schedules`, two weeks at
 * a time from a Monday (`?from=`, this week's when left out): the manager's
 * timeline grid, read-only, every member's row with the person's own first;
 * one grid per department when they are on rosters of more than one. A day no
 * published roster covers shows the grid's empty day. Each roster links to its
 * own page (its changes since publication and cover offers). Needs no
 * scheduling permission: the API answers only published rosters the person is
 * on.
 */
export const MyRosterDaysPage = (): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const companyId = useCurrentCompanyId();
	const { from } = route.useSearch();
	const navigate = route.useNavigate();
	const thisWeek = mondayOf(new Date());
	const monday = from ?? thisWeek;
	const shown = windowFrom(monday);
	const timeline = useMemberTimeline(companyId, shown);
	const days = windowDays(shown.start, "two");
	/** Shows the two weeks from `nextMonday`, leaving this week's out of the URL. */
	const show = (nextMonday: string): void => {
		void navigate({
			search: nextMonday === thisWeek ? {} : { from: nextMonday },
		});
	};
	const content = (): FunctionComponent => {
		if (timeline.status === "pending")
			return <Problem alert={false}>{t(`${key}.loading`)}</Problem>;
		if (timeline.status === "error")
			return <Problem alert>{t(`${key}.loadFailed`)}</Problem>;
		const { groups, rostersRead } = timeline;
		return (
			<>
				{timeline.rosters.length > 0 && (
					<ul className="mt-6 flex flex-col gap-2 text-sm text-neutral-800">
						{timeline.rosters.map((roster) => {
							const period = formatPeriod(
								{ start: roster.coveredFrom, end: roster.coveredTo },
								language
							);
							return (
								<li
									key={roster.scheduleId}
									className="flex flex-wrap items-center gap-x-3"
								>
									<span>
										{roster.departmentName}
										{" · "}
										{roster.branchName}
										{" · "}
										{period}
									</span>
									<Button
										params={{ scheduleId: roster.scheduleId }}
										to="/me/schedules/$scheduleId"
										variant="textlink"
										aria-label={t(`${key}.teamRosterNamed`, {
											department: roster.departmentName,
											period,
										})}
									>
										{t(`${key}.teamRoster`)}
									</Button>
								</li>
							);
						})}
					</ul>
				)}
				{/* With no published roster in these days, one empty grid says no one is rostered. */}
				{groups.length === 0 && (
					<div className="mt-6">
						<TimelineGrid
							days={days}
							rosters={rostersRead}
							rows={[]}
							schedules={[]}
							statusRow={null}
							view="two"
						/>
					</div>
				)}
				{groups.map((group) => (
					<section
						key={`${group.branchName} ${group.departmentName}`}
						className="mt-6"
					>
						{groups.length > 1 && (
							<h2 className="mb-3 text-xl font-medium text-neutral-900">
								{group.departmentName}
								{" · "}
								{group.branchName}
							</h2>
						)}
						{/* Read-only: no status strip, so the head row is the dates alone. */}
						<TimelineGrid
							days={days}
							rosters={rostersRead}
							rows={group.rows}
							schedules={group.schedules}
							statusRow={null}
							view="two"
						/>
					</section>
				))}
			</>
		);
	};
	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t(`${key}.title`)}
			</h1>
			<p className="mt-3 text-sm text-neutral-800">{t(`${key}.subtitle`)}</p>
			{/* The week navigator's controls, stepping two weeks at a time. */}
			<div
				aria-label={t(`${key}.navigatorLabel`)}
				className="mt-6 flex flex-wrap items-center gap-3"
				role="group"
			>
				<Button
					size="sm"
					variant="secondary"
					onClick={() => {
						show(thisWeek);
					}}
				>
					{t("weekNavigator.thisWeek")}
				</Button>
				<Button
					aria-label={t(`${key}.previous`)}
					className={stepButtonClasses}
					variant="icon"
					onClick={() => {
						show(stepWindow(monday, -1));
					}}
				>
					<ChevronLeftIcon />
				</Button>
				<Button
					aria-label={t(`${key}.next`)}
					className={stepButtonClasses}
					variant="icon"
					onClick={() => {
						show(stepWindow(monday, 1));
					}}
				>
					<ChevronRightIcon />
				</Button>
				<p
					aria-live="polite"
					className="min-w-0 text-sm font-semibold text-neutral-900"
				>
					{formatPeriod(shown, language)}
				</p>
			</div>
			{content()}
		</>
	);
};
