import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { mondayOf } from "@/common/weeks";
import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";
import { myRosterDaysQuery } from "@/features/scheduling/myRoster/api";
import { MyRosterDayList } from "@/features/scheduling/myRoster/MyRosterDayList";
import {
	myRosterDaysFrom,
	stepWindow,
	windowFrom,
} from "@/features/scheduling/myRoster/myRosterDays";
import { formatPeriod } from "@/features/scheduling/periods";
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
 * The person's own days at `/me/schedules`, two weeks at a time from a Monday
 * (`?from=`, this week's when left out): one row per day with its tile from a
 * published roster, or a line saying no published roster covers it. Each
 * roster the days come from links to its whole team's roster. Needs no
 * scheduling permission: the API answers only published rosters the person
 * is on, and only their own rows.
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
	const answer = useQuery(
		myRosterDaysQuery(companyId, shown.start, shown.end)
	);
	/** Shows the two weeks from `nextMonday`, leaving this week's out of the URL. */
	const show = (nextMonday: string): void => {
		void navigate({
			search: nextMonday === thisWeek ? {} : { from: nextMonday },
		});
	};
	const content = (): FunctionComponent => {
		if (answer.isPending)
			return <Problem alert={false}>{t(`${key}.loading`)}</Problem>;
		if (answer.isError)
			return <Problem alert>{t(`${key}.loadFailed`)}</Problem>;
		return (
			<>
				{answer.data.rosters.length > 0 && (
					<ul className="mt-6 flex flex-col gap-2 text-sm text-neutral-800">
						{answer.data.rosters.map((roster) => {
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
				<MyRosterDayList
					className="mt-6"
					days={myRosterDaysFrom(monday, answer.data)}
				/>
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
