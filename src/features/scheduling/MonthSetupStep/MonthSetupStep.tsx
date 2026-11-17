import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { DatePicker } from "@/components/forms/DatePicker";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Badge } from "@/components/ui/Badge";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Tab, TabList, Tabs } from "@/components/ui/Tabs";
import type { DatesPlan } from "@/features/scheduling/dates/api";
import {
	MAX_DAYS_BY_DATES,
	maxLastDayOf,
	planRowOf,
	type PlanRow,
} from "@/features/scheduling/dates/datesSetup";
import { DayCoverMarks } from "@/features/scheduling/months/DayCoverMarks";
import { NAME_MAX_LENGTH } from "@/features/organisation/nameSchema";
import { formatPeriod } from "@/features/scheduling/periods";
import { datesRefusalText } from "@/features/scheduling/schedules/scheduleRefusal";
import type { MonthSetup } from "@/features/scheduling/months/monthGeneration";
import { weekRangeText } from "@/features/scheduling/months/monthCopy";
import { formatMonth } from "@/features/scheduling/months/monthWeeks";
import {
	badgeOf,
	skippedWeeksOf,
	tickedRangesOf,
	type TickableWeek,
	type TickedRange,
} from "@/features/scheduling/months/weekTicks";
import { chosenOutsideOffered } from "@/features/scheduling/ScheduleSetupStep/chosenDepartment";
import {
	monthSetupSchema,
	SCHEDULE_FOR,
	type MonthSetupValues,
	type ScheduleFor,
} from "@/features/scheduling/setupSchema";
import { StepPanel } from "@/features/scheduling/StepPanel";
import { workspaceQuery } from "@/features/workspace/api";
import { DepartmentSelector } from "@/features/workspace/DepartmentSelector";
import { SCHEDULE_CREATE_KEYS } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { departmentChoices } from "@/features/workspace/unitChoices";

export type { MonthSetupValues };

/** The month's weeks to tick, and which are ticked; the page owns the ticks. */
export type MonthSetupWeeks = {
	rows: Array<TickableWeek>;
	ticked: Array<string>;
	onTickedChange: (ticked: Array<string>) => void;
};

/** What the page knows of the chosen dates: their plan, whether it is loading, and the branch's today. */
export type MonthSetupDates = {
	/** Undefined until both days are valid and the plan is read. */
	plan: DatesPlan | undefined;
	pending: boolean;
	today: string;
};

/** What Setup schedules for, and the chosen days. */
export type DatesChoice = Pick<
	MonthSetupValues,
	"scheduleFor" | "firstDay" | "lastDay" | "name"
>;

export type MonthSetupStepProps = {
	/** Lets the step's Next button, outside the form, submit it. */
	formId: string;
	companyId: string;
	/** The header's Branch: only its Departments are offered. Undefined offers every one, under its Branch. */
	branchId?: string;
	defaultValues: MonthSetupValues;
	/** The months offered, as "yyyy-MM" in order: `monthChoicesFrom(today)`. */
	months: Array<string>;
	/** The chosen month's weeks to tick; undefined while no Department is chosen or the month is loading. */
	weeks?: MonthSetupWeeks;
	/** A month to choose while the person hasn't chosen one by hand: the first with a week to schedule. */
	suggestedMonth?: string;
	/** Shown below the Department and Month row: the Department's readiness. */
	departmentExtras?: ReactNode;
	/** Shown last: what the month's weeks use, and the way to choose per week. */
	usesLine?: ReactNode;
	/** Told the Department chosen, whenever it changes. */
	onDepartmentChange: (departmentId: string) => void;
	/** Told the month chosen, whenever it changes. */
	onMonthChange: (month: string) => void;
	/** Told the two settings, whenever they change, for a week the page saves before the form is submitted. */
	onSettingsChange?: (settings: MonthSetup) => void;
	/** In Dates: the plan of the chosen days. */
	dates?: MonthSetupDates;
	/** Told what Setup schedules for and the chosen days, whenever they change. */
	onDatesChange?: (dates: DatesChoice) => void;
	onSubmit: (values: MonthSetupValues) => void;
	className?: string;
};

/** The setting every week the month run creates takes, as a week's setup has it. */
const SETTINGS = [
	{
		name: "includeLeave",
		labelKey: "scheduling.setup.includeLeave",
		descriptionKey: "scheduling.setup.includeLeaveDescription",
	},
] as const;

const rangeOf = (week: TickableWeek): TickedRange => ({
	start: week.periodStart,
	end: week.periodEnd,
});

/** A plan week's dates and what happens to them: the whole week, some of its days, or kept as it is. */
const planRowLine = (row: PlanRow, language: string, t: TFunction): string =>
	row.badge === "kept"
		? t("scheduling.dates.setup.keptLine", {
				state: t(
					`scheduling.months.states.${row.keptState ?? "UNKNOWN"}`
				).toLocaleLowerCase(language),
			})
		: row.newDayCount === 7
			? t("scheduling.dates.setup.wholeWeek")
			: t("scheduling.dates.setup.someDays", { count: row.newDayCount });

/**
 * "What this creates": each week the dates touch, its days (new days look
 * covered, others have no roster) and New or Kept; then how many days are
 * generated, the kept days, and why the dates are refused, if they are.
 */
const DatesPlanRows = ({ plan }: { plan: DatesPlan }): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const rows = plan.weeks.map(planRowOf);
	const datesText = (start: string, end: string): string =>
		formatPeriod({ start, end }, language);
	const columns: Array<DataTableColumn<PlanRow>> = [
		{
			id: "dates",
			header: t("scheduling.dates.setup.datesColumn"),
			cell: (row): FunctionComponent => (
				<span className="flex flex-col">
					<span>{datesText(row.asked.start, row.asked.end)}</span>
					<span className="text-xs text-neutral-700">
						{planRowLine(row, language, t)}
					</span>
				</span>
			),
		},
		{
			id: "days",
			header: t("scheduling.dates.setup.daysColumn"),
			cell: (row): FunctionComponent => <DayCoverMarks days={row.days} />,
		},
		{
			id: "state",
			header: t("scheduling.months.setup.stateColumn"),
			cell: (row): FunctionComponent => (
				<Badge tone={row.badge === "new" ? "neutral" : "success"}>
					{t(`scheduling.dates.setup.${row.badge}`)}
				</Badge>
			),
		},
	];
	const newWeeks = plan.weeks.filter((week) => week.newFrom !== null);
	const firstNew = newWeeks[0]?.newFrom;
	const lastNew = newWeeks[newWeeks.length - 1]?.newTo;
	const keptDays = plan.weeks
		.filter((week) => week.kept.length > 0)
		.map((week) => datesText(week.askedFrom, week.askedTo));
	return (
		<div className="flex flex-col gap-4">
			<h3 className="text-xl font-semibold text-neutral-900">
				{t("scheduling.dates.setup.creates")}
			</h3>
			<DataTable
				columns={columns}
				data={rows}
				getRowId={(row) => row.periodStart}
				label={t("scheduling.dates.setup.creates")}
			/>
			{firstNew && lastNew && (
				<p className="text-sm font-semibold text-neutral-900">
					{t("scheduling.dates.setup.summary", {
						count: plan.newDays,
						range: datesText(firstNew, lastNew),
					})}
				</p>
			)}
			{keptDays.length > 0 && (
				<Callout tone="warning">
					{t("scheduling.dates.setup.keptNote", {
						days: new Intl.ListFormat(language, { type: "conjunction" }).format(
							keptDays
						),
					})}
				</Callout>
			)}
			{plan.refusal && (
				<Callout tone="error">
					{datesRefusalText(plan.refusal, t, language)}
				</Callout>
			)}
		</div>
	);
};

/**
 * Which Department to generate, and for what: a month and which of its
 * weeks (no name: the API names each week), or any dates up to 31 days with
 * an optional name and what generating them creates, week by week; then
 * whether leave counts in the weeks it creates. The Department is chosen as
 * a week's setup chooses it (ScheduleSetupStep): the active ones of the
 * header's Branch where schedules may be created.
 */
export const MonthSetupStep = ({
	formId,
	companyId,
	branchId,
	defaultValues,
	months,
	weeks,
	suggestedMonth,
	departmentExtras,
	usesLine,
	onDepartmentChange,
	onMonthChange,
	onSettingsChange,
	dates,
	onDatesChange,
	onSubmit,
	className,
}: MonthSetupStepProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const workspace = useQuery({ ...workspaceQuery, retry });
	const today = dates?.today ?? "";
	const schema = useMemo(
		() => monthSetupSchema(t, { today, language }),
		[t, today, language]
	);
	const { control, handleSubmit, setValue, formState, register } =
		useForm<MonthSetupValues>({
			resolver: zodResolver(schema),
			defaultValues,
			mode: "onTouched",
		});
	const { errors } = formState;
	const [
		departmentId,
		month,
		includeLeave,
		scheduleFor,
		firstDay,
		lastDay,
		name,
	] = useWatch({
		control,
		name: [
			"departmentId",
			"month",
			"includeLeave",
			"scheduleFor",
			"firstDay",
			"lastDay",
			"name",
		],
	});
	useEffect(() => {
		onDatesChange?.({ scheduleFor, firstDay, lastDay, name });
	}, [scheduleFor, firstDay, lastDay, name, onDatesChange]);
	useEffect(() => {
		onSettingsChange?.({ includeLeave });
	}, [includeLeave, onSettingsChange]);
	useEffect(() => {
		onDepartmentChange(departmentId);
	}, [departmentId, onDepartmentChange]);
	useEffect(() => {
		onMonthChange(month);
	}, [month, onMonthChange]);
	const offered = workspace.data
		? departmentChoices(workspace.data, companyId, SCHEDULE_CREATE_KEYS, {
				activeOnly: true,
			}).filter(
				(choice) => branchId === undefined || choice.branchId === branchId
			)
		: undefined;
	// Nothing is saved yet, so a Department the new Branch doesn't hold is simply let go.
	const outside = chosenOutsideOffered(offered, departmentId);
	useEffect(() => {
		if (outside) setValue("departmentId", "");
	}, [outside, setValue]);
	// A month the manager chose stays, even one equal to the default; until then the page's suggestion is taken.
	// A month named in the URL gets no suggestion from the page.
	const [monthChosenByHand, setMonthChosenByHand] = useState(false);
	useEffect(() => {
		if (suggestedMonth && !monthChosenByHand) setValue("month", suggestedMonth);
	}, [suggestedMonth, monthChosenByHand, setValue]);
	const departmentHint =
		workspace.data === undefined && workspace.isError
			? t("scheduling.setup.departmentsError")
			: offered !== undefined && offered.length === 0
				? t("scheduling.setup.departmentsNone")
				: undefined;
	const idPrefix = useId();
	const fieldId = (name: keyof MonthSetupValues): string =>
		`${idPrefix}-${name}`;
	const describedBy = (
		name: keyof MonthSetupValues,
		hint: boolean
	): string | undefined => {
		const ids = formRowIds(fieldId(name));
		if (errors[name]) return ids.errorId;
		return hint ? ids.hintId : undefined;
	};
	const monthHint = t("scheduling.months.setup.belongs");
	const datesHint = t("scheduling.dates.setup.hint", {
		max: MAX_DAYS_BY_DATES,
	});
	const weekColumns = useMemo(
		(): Array<DataTableColumn<TickableWeek>> => [
			{
				id: "week",
				header: t("scheduling.months.setup.weekColumn"),
				cell: (week) => weekRangeText(rangeOf(week), language, t),
			},
			{
				id: "state",
				header: t("scheduling.months.setup.stateColumn"),
				cell: (week): FunctionComponent => {
					const badge = badgeOf(week.look);
					return <Badge tone={badge.tone}>{t(badge.key)}</Badge>;
				},
			},
		],
		[t, language]
	);
	const ticked = weeks?.ticked ?? [];
	const tickedRanges = new Intl.ListFormat(language, {
		type: "conjunction",
	}).format(
		tickedRangesOf(ticked).map((range) => weekRangeText(range, language, t))
	);
	// Each ticked week with a note, Monday order: what generating it replaces or how it is generated.
	const tickedNotes = (weeks?.rows ?? []).flatMap((week) =>
		week.note !== undefined && ticked.includes(week.periodStart)
			? [{ week, note: week.note }]
			: []
	);
	const noneCanBeTicked = !(weeks?.rows ?? []).some((week) => week.canTick);
	const skippedWeeks = skippedWeeksOf(weeks?.rows ?? [], ticked);

	return (
		<StepPanel
			className={className}
			description={t("scheduling.months.setup.description")}
			title={t("scheduling.setup.title")}
		>
			<form
				noValidate
				id={formId}
				onSubmit={(event) => {
					void handleSubmit(onSubmit)(event);
				}}
			>
				<div className="mt-10 flex flex-col gap-8">
					<div className="flex flex-col gap-8 sm:flex-row">
						<FormRow
							required
							className="sm:w-72"
							error={errors.departmentId?.message}
							hint={departmentHint}
							htmlFor={fieldId("departmentId")}
							label={t("scheduling.setup.department")}
							layout="stacked"
						>
							<Controller
								control={control}
								name="departmentId"
								render={({ field }) => (
									<DepartmentSelector
										ref={field.ref}
										activeOnly
										branchHeadings
										aria-invalid={errors.departmentId ? true : undefined}
										branchId={branchId}
										className="w-full"
										companyId={companyId}
										keys={SCHEDULE_CREATE_KEYS}
										name={field.name}
										placeholder={t("scheduling.setup.departmentPlaceholder")}
										status={errors.departmentId ? "error" : undefined}
										value={field.value}
										aria-describedby={describedBy(
											"departmentId",
											departmentHint !== undefined
										)}
										aria-labelledby={
											formRowIds(fieldId("departmentId")).labelId
										}
										onChange={field.onChange}
									/>
								)}
							/>
						</FormRow>
						{scheduleFor === "month" && (
							<FormRow
								required
								className="sm:w-72"
								error={errors.month?.message}
								hint={monthHint}
								htmlFor={fieldId("month")}
								label={t("scheduling.months.setup.month")}
								layout="stacked"
							>
								<Controller
									control={control}
									name="month"
									render={({ field }) => (
										<Select
											ref={field.ref}
											aria-describedby={describedBy("month", true)}
											aria-labelledby={formRowIds(fieldId("month")).labelId}
											className="w-full"
											name={field.name}
											status={errors.month ? "error" : undefined}
											value={field.value}
											options={months.map((choice) => ({
												value: choice,
												label: formatMonth(choice, language),
											}))}
											onChange={(value) => {
												setMonthChosenByHand(true);
												field.onChange(value);
											}}
										/>
									)}
								/>
							</FormRow>
						)}
					</div>
					<div className="flex flex-col gap-2">
						<span className="text-sm font-normal text-neutral-800">
							{t("scheduling.months.setup.scheduleFor")}
						</span>
						<Controller
							control={control}
							name="scheduleFor"
							render={({ field }) => (
								<Tabs
									selectedIndex={SCHEDULE_FOR.indexOf(field.value)}
									onChange={(index) => {
										field.onChange(SCHEDULE_FOR[index] ?? "month");
									}}
								>
									<TabList
										aria-label={t("scheduling.months.setup.scheduleFor")}
										className="-ml-1"
									>
										{SCHEDULE_FOR.map((each: ScheduleFor) => (
											<Tab key={each}>
												{t(`scheduling.months.setup.${each}`)}
											</Tab>
										))}
									</TabList>
								</Tabs>
							)}
						/>
					</div>
					{scheduleFor === "dates" && (
						<div className="flex flex-col gap-8">
							<div className="flex flex-col gap-8 sm:flex-row">
								{(["firstDay", "lastDay"] as const).map((day) => (
									<FormRow
										key={day}
										required
										className="sm:w-72"
										error={errors[day]?.message}
										hint={day === "firstDay" ? datesHint : undefined}
										htmlFor={fieldId(day)}
										label={t(`scheduling.dates.setup.${day}`)}
										layout="stacked"
									>
										<Controller
											control={control}
											name={day}
											render={({ field }) => (
												<DatePicker
													ref={field.ref}
													aria-invalid={errors[day] ? true : undefined}
													aria-labelledby={formRowIds(fieldId(day)).labelId}
													className="w-full"
													id={fieldId(day)}
													label={t(`scheduling.dates.setup.${day}`)}
													mode="single"
													name={field.name}
													status={errors[day] ? "error" : undefined}
													value={field.value}
													aria-describedby={describedBy(
														day,
														day === "firstDay"
													)}
													maxDate={
														day === "lastDay" && firstDay !== ""
															? maxLastDayOf(firstDay)
															: undefined
													}
													minDate={
														day === "lastDay" && firstDay !== ""
															? firstDay
															: today || undefined
													}
													onBlur={field.onBlur}
													onChange={field.onChange}
												/>
											)}
										/>
									</FormRow>
								))}
							</div>
							<FormRow
								className="sm:w-[37rem]"
								error={errors.name?.message}
								hint={t("scheduling.dates.setup.nameHint")}
								htmlFor={fieldId("name")}
								label={t("scheduling.dates.setup.name")}
								layout="stacked"
								counter={t("scheduling.dates.setup.nameCounter", {
									count: name.length,
									max: NAME_MAX_LENGTH,
								})}
							>
								<Input
									aria-describedby={describedBy("name", true)}
									id={fieldId("name")}
									maxLength={NAME_MAX_LENGTH}
									status={errors.name ? "error" : undefined}
									{...register("name")}
								/>
							</FormRow>
							{dates?.pending && (
								<p className="text-sm text-neutral-800" role="status">
									{t("scheduling.dates.setup.checking")}
								</p>
							)}
							{dates?.plan && <DatesPlanRows plan={dates.plan} />}
						</div>
					)}
					{scheduleFor === "month" && weeks && (
						<div className="flex flex-col gap-4">
							<h3 className="text-xl font-semibold text-neutral-900">
								{t("scheduling.months.setup.weeksLabel")}
							</h3>
							<DataTable
								columns={weekColumns}
								data={weeks.rows}
								getRowId={(week) => week.periodStart}
								label={t("scheduling.months.setup.weeksLabel")}
								selection={{
									rowLabel: (week) => weekRangeText(rangeOf(week), language, t),
									selectedIds: weeks.ticked,
									onChange: weeks.onTickedChange,
									canSelect: (week) => week.canTick,
								}}
							/>
							{ticked.length > 0 ? (
								<p className="text-sm font-semibold text-neutral-900">
									{t("scheduling.months.setup.chosen", {
										count: ticked.length,
										ranges: tickedRanges,
									})}
								</p>
							) : (
								<Callout tone="error">
									{noneCanBeTicked
										? t("scheduling.months.setup.noneOpen", {
												month: formatMonth(month, language),
											})
										: t("scheduling.months.setup.noneTicked")}
								</Callout>
							)}
							{tickedNotes.map(({ week, note }) => (
								<Callout key={week.periodStart} tone="warning">
									{t(`scheduling.months.setup.${note}Note`, {
										week: weekRangeText(rangeOf(week), language, t),
										// A started week is generated from today on (API ADR-0115).
										range: weekRangeText(
											{ start: today || week.periodStart, end: week.periodEnd },
											language,
											t
										),
									})}
								</Callout>
							))}
							{skippedWeeks.map((week) => (
								<Callout key={week.periodStart} tone="warning">
									{t("scheduling.months.setup.skippedNote", {
										week: weekRangeText(rangeOf(week), language, t),
									})}
								</Callout>
							))}
						</div>
					)}
					{departmentExtras}
				</div>
				<hr className="my-10 border-neutral-400" />
				<h3 className="text-xl font-semibold text-neutral-900">
					{t("scheduling.setup.additional")}
				</h3>
				<div className="mt-8 flex flex-col gap-5">
					{SETTINGS.map(({ name, labelKey, descriptionKey }) => (
						<Controller
							key={name}
							control={control}
							name={name}
							render={({ field }) => (
								<Checkbox
									checked={field.value}
									description={t(descriptionKey)}
									label={t(labelKey)}
									labelClassName="text-sm font-semibold"
									name={field.name}
									onBlur={field.onBlur}
									onChange={(event) => {
										field.onChange(event.target.checked);
									}}
								/>
							)}
						/>
					))}
				</div>
				{usesLine && <div className="mt-10">{usesLine}</div>}
			</form>
		</StepPanel>
	);
};
