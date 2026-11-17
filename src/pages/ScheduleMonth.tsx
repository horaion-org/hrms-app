import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { getRouteApi, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ErrorText } from "@/components/ui/ErrorText";
import {
	ArrowLeftIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from "@/components/ui/Icon";
import { openingBalancesQuery } from "@/features/scheduling/hours/api";
import { OpeningHoursCallout } from "@/features/scheduling/hours/OpeningHoursCallout";
import { OpeningHoursSection } from "@/features/scheduling/hours/OpeningHoursSection";
import {
	openingWeekOf,
	unknownOpeningCount,
} from "@/features/scheduling/hours/openingSummary";
import {
	monthGenerationCheckQuery,
	scheduleMonthQuery,
	type MonthGeneration,
	type MonthWeek,
	type ScheduleMonth,
} from "@/features/scheduling/months/api";
import {
	BeforeGeneratePanel,
	type PanelLink,
} from "@/features/scheduling/months/BeforeGeneratePanel";
import {
	failedWeekOf,
	handChangedCoveredWeeks,
	isGenerating,
	refusedWeeks,
	retryWeeksOf,
	showsBeforeGenerate,
	showsRegenerate,
	stoppedWeeksOf,
} from "@/features/scheduling/months/monthGeneration";
import { refusedWeeksFrom } from "@/features/scheduling/months/refusedWeeksState";
import { RegenerateMonthDialog } from "@/features/scheduling/months/RegenerateMonthDialog";
import {
	type GenerateMonth,
	useGenerateMonth,
} from "@/features/scheduling/months/useGenerateMonth";
import { isMonth } from "@/features/scheduling/months/monthSearch";
import {
	crossingWeekOf,
	formatDayAndMonth,
	formatMonth,
	formatWeekDates,
	monthOf,
	shiftMonth,
} from "@/features/scheduling/months/monthWeeks";
import {
	stateCountsLine,
	weekChangedRefusal,
} from "@/features/scheduling/months/monthCopy";
import { WeekCard } from "@/features/scheduling/months/WeekCard";
import { dayMarkLooks } from "@/features/scheduling/months/weekStateLooks";
import { generationFailure } from "@/features/scheduling/roster/generationFailure";
import {
	monthGenerationRefusal,
	refusalOfCode,
} from "@/features/scheduling/schedules/scheduleRefusal";
import { departmentScope } from "@/features/workspace/scopes";
import { type Access, useAccess } from "@/features/workspace/useAccess";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";

const route = getRouteApi("/_authenticated/_app/scheduling_/months/$month");

const key = "scheduling.months.page";

/** Back to the Scheduling page, keeping the Department the person came from. */
const BackLink = ({
	department,
}: {
	department?: string;
}): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Button
			leadingIcon={<ArrowLeftIcon />}
			search={department === undefined ? {} : { department }}
			to="/scheduling"
			variant="textlink"
		>
			{t("scheduling.overview.title")}
		</Button>
	);
};

/** A line saying why the month isn't shown; an alert unless it is still loading. */
const Problem = ({
	alert,
	children,
}: {
	alert: boolean;
	children: string;
}): FunctionComponent => (
	<p
		className="mt-6 text-sm text-neutral-800"
		role={alert ? "alert" : undefined}
	>
		{children}
	</p>
);

/** Shown in place of the month when its route fails. */
export const ScheduleMonthProblem = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<>
			<BackLink />
			<Problem alert>{t(`${key}.loadFailed`)}</Problem>
		</>
	);
};

/** "‹ October" and "December ›": the neighbouring months of the same Department. */
const MonthSteps = ({
	month,
	department,
}: {
	month: string;
	department: string;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const previous = shiftMonth(month, -1);
	const next = shiftMonth(month, 1);
	return (
		<div className="flex flex-wrap gap-2">
			<Button
				leadingIcon={<ChevronLeftIcon />}
				params={{ month: previous }}
				search={{ department }}
				to="/scheduling/months/$month"
				variant="secondary"
				aria-label={t(`${key}.previousMonth`, {
					month: formatMonth(previous, language),
				})}
			>
				{formatMonth(previous, language)}
			</Button>
			<Button
				params={{ month: next }}
				search={{ department }}
				to="/scheduling/months/$month"
				trailingIcon={<ChevronRightIcon />}
				variant="secondary"
				aria-label={t(`${key}.nextMonth`, {
					month: formatMonth(next, language),
				})}
			>
				{formatMonth(next, language)}
			</Button>
		</div>
	);
};

/** The week of the month before that ends in this month: shown once, on its Monday's month, with a link there. */
const CrossingWeekLine = ({
	month,
	department,
}: {
	month: string;
	department: string;
}): FunctionComponent => {
	const { i18n } = useTranslation();
	const week = crossingWeekOf(month);
	if (!week) return null;
	const language = formattingLocale(i18n);
	const weekMonth = monthOf(week.start);
	return (
		<p className="text-sm text-neutral-800">
			<Trans
				i18nKey={`${key}.crossingWeek`}
				components={[
					<Button
						key="month"
						params={{ month: weekMonth }}
						search={{ department }}
						to="/scheduling/months/$month"
						variant="textlink"
					/>,
				]}
				values={{
					week: formatWeekDates(week, language),
					month: formatMonth(weekMonth, language),
				}}
			/>
		</p>
	);
};

/** The two day marks and what publishing means for staff. */
const Legend = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col gap-2 text-sm text-neutral-800">
			<ul className="flex flex-wrap gap-x-6 gap-y-2">
				<li className="flex items-center gap-2">
					<span aria-hidden="true" className={dayMarkLooks.covered} />
					{t(`${key}.legendCovered`)}
				</li>
				<li className="flex items-center gap-2">
					<span aria-hidden="true" className={dayMarkLooks.short} />
					{t(`${key}.legendShort`)}
				</li>
			</ul>
			<p>{t(`${key}.footnote`)}</p>
		</div>
	);
};

/** The panel's fix links, each only where the person may read what it opens. */
const panelLinks = (
	access: Access,
	unit: { branchId: string; departmentId: string }
): { shifts?: PanelLink; constraints?: PanelLink; leave?: PanelLink } => {
	const scope = departmentScope(unit.departmentId);
	const setupTab =
		(view: "shifts" | "constraints"): PanelLink =>
		(label) => (
			<Button
				search={{ view, branch: unit.branchId, department: unit.departmentId }}
				to="/scheduling"
				variant="textlink"
			>
				{label}
			</Button>
		);
	return {
		...(access.can("shift:read", scope) ? { shifts: setupTab("shifts") } : {}),
		...(access.can("constraint:read", scope)
			? { constraints: setupTab("constraints") }
			: {}),
		...(access.canAnywhere("leave_request:read")
			? {
					leave: (label: string) => (
						<Button to="/leave" variant="textlink">
							{label}
						</Button>
					),
				}
			: {}),
	};
};

/** The note under a Generate that waits for something besides readiness; none while the lists load. */
const blockedNoteOf = (
	block: GenerateMonth["block"],
	department: string,
	t: TFunction
): string | undefined =>
	block === "cannotCreate"
		? t("scheduling.months.generate.cannotCreate", { department })
		: block === "listsHidden"
			? t("scheduling.week.listsHiddenNote", { department })
			: undefined;

/**
 * The month itself: its title and summary, Regenerate once every covered week
 * has a roster, before generating or while generating, a failed week that
 * stopped the weeks queued after it with "Try again", its weeks, and the legend.
 */
const MonthContent = ({
	scheduleMonth,
}: {
	scheduleMonth: ScheduleMonth;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const companyId = useCurrentCompanyId();
	const access = useAccess();
	const { month, departmentId, departmentName, branchId, weeks } =
		scheduleMonth;
	const mayGenerate = access.can(
		"schedule:generate",
		departmentScope(departmentId)
	);
	const showsPanel = mayGenerate && showsBeforeGenerate(scheduleMonth);
	const check = useQuery(
		monthGenerationCheckQuery(companyId, departmentId, month, showsPanel)
	);
	const generation = useGenerateMonth(companyId, scheduleMonth);
	// A failed week stopped the weeks queued after it; "Try again" generates exactly those weeks.
	const retryWeeks = retryWeeksOf(scheduleMonth);
	const retry = useGenerateMonth(companyId, scheduleMonth, retryWeeks);
	// Trying again over hand changes asks first, as Regenerate does; the dialog posts those weeks itself.
	const [confirmingRetry, setConfirmingRetry] = useState(false);
	// Named only while it stopped weeks after it.
	const failedWeek = failedWeekOf(scheduleMonth);
	const stoppedWeeks = stoppedWeeksOf(scheduleMonth);
	const datesOf = (week: MonthWeek): string =>
		formatWeekDates({ start: week.periodStart, end: week.periodEnd }, language);
	const failedWeekDates = failedWeek && datesOf(failedWeek);
	// The last refused post, to say why; a retry's refusal is the newer one.
	const refusedRun = retry.error ? retry : generation;
	// Generating again over hand changes asks first; the dialog posts the month itself.
	const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
	// The hours worked this month before its first scheduled week, entered on that week.
	const openingWeek = openingWeekOf(scheduleMonth);
	const openingScheduleId = openingWeek?.scheduleId ?? "";
	const unit = { branchId, departmentId };
	const [hoursOpen, setHoursOpen] = useState(false);
	const mayChangeHours =
		access.can("schedule:update", departmentScope(departmentId)) &&
		openingWeek?.state !== "PUBLISHED";
	const openings = useQuery(
		openingBalancesQuery(
			companyId,
			unit,
			openingScheduleId,
			openingScheduleId !== ""
		)
	);
	const unknownHours =
		openings.data?.applies === true ? unknownOpeningCount(openings.data) : 0;
	const [regenerateAnswer, setRegenerateAnswer] = useState<MonthGeneration>();
	const lastAnswer = generation.answer ?? retry.answer ?? regenerateAnswer;
	const refused = {
		...refusedWeeksFrom(
			useRouterState({ select: (state) => state.location.state })
		),
		...(lastAnswer ? refusedWeeks(lastAnswer) : {}),
	};
	const monthName = formatMonth(month, language);
	const first = weeks[0];
	const last = weeks[weeks.length - 1];
	const noSchedule = weeks.every((week) => week.scheduleId === null);
	const counts = stateCountsLine(weeks, t);
	const summary = [
		first &&
			last &&
			t(`${key}.weeks`, {
				count: weeks.length,
				from: formatDayAndMonth(first.periodStart, language),
				to: formatDayAndMonth(last.periodEnd, language),
			}),
		counts && `${counts}.`,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className="mt-4 flex flex-col gap-6">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex min-w-0 flex-col gap-2">
					<h1 className="text-4xl font-medium text-neutral-900">
						{t(`${key}.title`, {
							department: departmentName,
							month: formatMonth(month, language),
						})}
					</h1>
					<p className="text-sm text-neutral-800">{summary}</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{mayGenerate && showsRegenerate(scheduleMonth) && (
						<Button
							variant="secondary"
							onClick={() => {
								setConfirmingRegenerate(true);
							}}
						>
							{t("scheduling.months.regenerate.button", { month: monthName })}
						</Button>
					)}
					<MonthSteps department={departmentId} month={month} />
				</div>
			</header>
			<CrossingWeekLine department={departmentId} month={month} />
			{openingWeek && openingScheduleId !== "" && (
				<OpeningHoursSection
					canEdit={mayChangeHours}
					companyId={companyId}
					generated={openingWeek.state !== "DRAFT"}
					open={hoursOpen}
					scheduleId={openingScheduleId}
					unit={unit}
					onOpenChange={setHoursOpen}
				/>
			)}
			{isGenerating(scheduleMonth) && (
				<Callout role="status">
					<strong>
						{t("scheduling.months.generate.generatingTitle", {
							month: monthName,
						})}
					</strong>{" "}
					{t("scheduling.months.generate.generatingDetail")}
				</Callout>
			)}
			{showsPanel && check.isPending && (
				<p className="text-sm text-neutral-800" role="status">
					{t("scheduling.months.generate.panel.checking", { month: monthName })}
				</p>
			)}
			{showsPanel && check.isError && (
				<div className="flex flex-col items-start gap-2">
					<ErrorText>
						{t("scheduling.months.generate.panel.checkFailed", {
							month: monthName,
						})}
					</ErrorText>
					<Button
						variant="textlink"
						onClick={() => {
							void check.refetch();
						}}
					>
						{t("scheduling.rosterEdit.tryAgain")}
					</Button>
				</div>
			)}
			{showsPanel && check.data && (
				<BeforeGeneratePanel
					blockedNote={blockedNoteOf(generation.block, departmentName, t)}
					check={check.data}
					generating={generation.isPending}
					links={panelLinks(access, { branchId, departmentId })}
					month={month}
					waiting={generation.block === "listsLoading"}
					onGenerate={() => {
						if (handChangedCoveredWeeks(scheduleMonth).length > 0) {
							setConfirmingRegenerate(true);
							return;
						}
						// A refusal shows from generation.error below.
						void generation.generate().catch(() => undefined);
					}}
				/>
			)}
			{refusedRun.error && (
				<ErrorText>
					{monthGenerationRefusal(
						refusedRun.error,
						t,
						weekChangedRefusal(refusedRun.sentWeeks, scheduleMonth, language, t)
					)}
				</ErrorText>
			)}
			{noSchedule && !showsPanel && (
				<p className="text-sm text-neutral-800">
					{t(`${key}.noSchedule`, { month: formatMonth(month, language) })}
				</p>
			)}
			{failedWeekDates && (
				<Callout tone="error">
					<span className="block">
						{t("scheduling.months.generate.stoppedByFailedWeek", {
							count: stoppedWeeks.length,
							failed: failedWeekDates,
							stopped: stoppedWeeks.map(datesOf),
						})}
					</span>
					{mayGenerate && (
						<Button
							className="mt-2"
							loading={retry.isPending}
							size="sm"
							variant="secondary"
							onClick={() => {
								if (
									handChangedCoveredWeeks(scheduleMonth, retryWeeks).length > 0
								) {
									setConfirmingRetry(true);
									return;
								}
								// A refusal shows from refusedRun.error above.
								void retry.generate().catch(() => undefined);
							}}
						>
							{t("scheduling.rosterEdit.tryAgain")}
						</Button>
					)}
				</Callout>
			)}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
				{weeks.map((week) => {
					const refusal = refused[week.periodStart];
					return (
						<WeekCard
							key={week.periodStart}
							departmentId={departmentId}
							failedWeek={failedWeekDates}
							refusal={refusal ? refusalOfCode(refusal, t) : undefined}
							week={week}
							failureMessage={
								week.failure
									? generationFailure(
											{ ...week.failure, status: week.failure.runStatus },
											t
										).message
									: undefined
							}
						/>
					);
				})}
			</div>
			<Legend />
			{confirmingRegenerate && (
				<RegenerateMonthDialog
					companyId={companyId}
					month={scheduleMonth}
					notice={
						openings.data && unknownHours > 0 ? (
							<OpeningHoursCallout
								asOf={openings.data.asOf}
								className="mb-6"
								hours={{ kind: "read", unknownCount: unknownHours }}
								onAdd={
									mayChangeHours
										? (): void => {
												setConfirmingRegenerate(false);
												setHoursOpen(true);
											}
										: undefined
								}
							/>
						) : undefined
					}
					onStarted={setRegenerateAnswer}
					onClose={() => {
						setConfirmingRegenerate(false);
					}}
				/>
			)}
			{confirmingRetry && (
				<RegenerateMonthDialog
					companyId={companyId}
					month={scheduleMonth}
					weeks={retryWeeks}
					onStarted={setRegenerateAnswer}
					onClose={() => {
						setConfirmingRetry(false);
					}}
				/>
			)}
		</div>
	);
};

/** A 404: the Department is out of reach or gone. */
const isNotFound = (error: unknown): boolean =>
	error instanceof ApiProblemError && error.status === 404;

/** The month once read, or why it isn't shown: unreadable or out of reach, loading, or failed. */
const MonthBody = ({
	query,
}: {
	query: UseQueryResult<ScheduleMonth> | undefined;
}): FunctionComponent => {
	const { t } = useTranslation();
	if (!query || isNotFound(query.error))
		return <Problem alert>{t(`${key}.unavailable`)}</Problem>;
	if (query.isPending)
		return <Problem alert={false}>{t(`${key}.loading`)}</Problem>;
	if (query.isError) return <Problem alert>{t(`${key}.loadFailed`)}</Problem>;
	return <MonthContent scheduleMonth={query.data} />;
};

/**
 * One Department's month at `/scheduling/months/$month?department=…`: its
 * weeks in Monday order, each with its state, cover and one action.
 */
export const ScheduleMonthPage = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { month } = route.useParams();
	const { department } = route.useSearch();
	const access = useAccess();
	const readable =
		access.canAnywhere("schedule:read") &&
		isMonth(month) &&
		department !== undefined;
	const query = useQuery(
		scheduleMonthQuery(companyId, department ?? "", month, readable)
	);

	return (
		<>
			<BackLink department={department} />
			<MonthBody query={readable ? query : undefined} />
		</>
	);
};
