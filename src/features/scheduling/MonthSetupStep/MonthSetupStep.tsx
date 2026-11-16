import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { useEffect, useId, useMemo, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import { Badge } from "@/components/ui/Badge";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import type { MonthSetup } from "@/features/scheduling/months/monthGeneration";
import {
	formatMonth,
	formatWeekdayDate,
} from "@/features/scheduling/months/monthWeeks";
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
	type MonthSetupValues,
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

/** A week's or a range's dates in the person's language, e.g. "Mon 23 Nov to Sun 29 Nov". */
const datesOf = (range: TickedRange, language: string, t: TFunction): string =>
	t("scheduling.months.setup.weekDates", {
		from: formatWeekdayDate(range.start, language),
		to: formatWeekdayDate(range.end, language),
	});

const rangeOf = (week: TickableWeek): TickedRange => ({
	start: week.periodStart,
	end: week.periodEnd,
});

/**
 * Which Department and month to generate, which of the month's weeks, and
 * whether leave counts in the weeks it creates. No name: the API names each
 * week. The Department is chosen as a week's setup chooses it
 * (ScheduleSetupStep): the active ones of the header's Branch where schedules
 * may be created.
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
	onSubmit,
	className,
}: MonthSetupStepProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const workspace = useQuery({ ...workspaceQuery, retry });
	const schema = useMemo(() => monthSetupSchema(t), [t]);
	const { control, handleSubmit, setValue, getFieldState, formState } =
		useForm<MonthSetupValues>({
			resolver: zodResolver(schema),
			defaultValues,
			mode: "onTouched",
		});
	const { errors } = formState;
	const [departmentId, month, includeLeave] = useWatch({
		control,
		name: ["departmentId", "month", "includeLeave"],
	});
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
	// A month chosen by hand stays; otherwise the page's suggestion is taken, without marking the field changed.
	const monthChosenByHand = getFieldState("month", formState).isDirty;
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
	const weekColumns = useMemo(
		(): Array<DataTableColumn<TickableWeek>> => [
			{
				id: "week",
				header: t("scheduling.months.setup.weekColumn"),
				cell: (week) => datesOf(rangeOf(week), language, t),
			},
			{
				id: "state",
				header: t("scheduling.months.setup.stateColumn"),
				cell: (week) => {
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
		tickedRangesOf(ticked).map((range) => datesOf(range, language, t))
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
										aria-labelledby={formRowIds(fieldId("month")).labelId}
										className="w-full"
										name={field.name}
										status={errors.month ? "error" : undefined}
										value={field.value}
										aria-describedby={describedBy("month", true)}
										options={months.map((choice) => ({
											value: choice,
											label: formatMonth(choice, language),
										}))}
										onChange={field.onChange}
									/>
								)}
							/>
						</FormRow>
					</div>
					{weeks && (
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
									rowLabel: (week) => datesOf(rangeOf(week), language, t),
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
										week: datesOf(rangeOf(week), language, t),
									})}
								</Callout>
							))}
							{skippedWeeks.map((week) => (
								<Callout key={week.periodStart} tone="warning">
									{t("scheduling.months.setup.skippedNote", {
										week: datesOf(rangeOf(week), language, t),
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
