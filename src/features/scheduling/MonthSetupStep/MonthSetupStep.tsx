import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useEffect, useId, useMemo, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import {
	formatMonth,
	formatWeekdayDate,
	mondaysIn,
} from "@/features/scheduling/months/monthWeeks";
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

export type MonthSetupStepProps = {
	/** Lets the step's Next button, outside the form, submit it. */
	formId: string;
	companyId: string;
	/** The header's Branch: only its Departments are offered. Undefined offers every one, under its Branch. */
	branchId?: string;
	defaultValues: MonthSetupValues;
	/** The months offered, as "yyyy-MM" in order: `monthChoicesFrom(today)`. */
	months: Array<string>;
	/** Shown below the Department and Month row: the Department's readiness. */
	departmentExtras?: ReactNode;
	/** Shown last: what the month's weeks use, and the way to choose per week. */
	usesLine?: ReactNode;
	/** Told the Department chosen, whenever it changes. */
	onDepartmentChange: (departmentId: string) => void;
	/** Told the month chosen, whenever it changes. */
	onMonthChange: (month: string) => void;
	onSubmit: (values: MonthSetupValues) => void;
	className?: string;
};

/** The two settings every week the month run creates takes, as a week's setup has them. */
const SETTINGS = [
	{
		name: "includeLeave",
		labelKey: "scheduling.setup.includeLeave",
		descriptionKey: "scheduling.setup.includeLeaveDescription",
	},
	{
		name: "allowOpenShifts",
		labelKey: "scheduling.setup.allowOpenShifts",
		descriptionKey: "scheduling.setup.allowOpenShiftsDescription",
	},
] as const;

/**
 * Which Department and month to generate, and how leave and open shifts
 * count in the weeks it creates. No name: the API names each week. The
 * Department is chosen as a week's setup chooses it (ScheduleSetupStep):
 * the active ones of the header's Branch where schedules may be created.
 */
export const MonthSetupStep = ({
	formId,
	companyId,
	branchId,
	defaultValues,
	months,
	departmentExtras,
	usesLine,
	onDepartmentChange,
	onMonthChange,
	onSubmit,
	className,
}: MonthSetupStepProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const workspace = useQuery({ ...workspaceQuery, retry });
	const schema = useMemo(() => monthSetupSchema(t), [t]);
	const {
		control,
		handleSubmit,
		setValue,
		formState: { errors },
	} = useForm<MonthSetupValues>({
		resolver: zodResolver(schema),
		defaultValues,
		mode: "onTouched",
	});
	const [departmentId, month] = useWatch({
		control,
		name: ["departmentId", "month"],
	});
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
	const mondays = month ? mondaysIn(month) : [];
	const firstMonday = mondays[0];
	const lastMonday = mondays[mondays.length - 1];
	const weeksLine =
		firstMonday && lastMonday
			? t("scheduling.months.setup.weeks", {
					count: mondays.length,
					from: formatWeekdayDate(firstMonday, language),
					to: formatWeekdayDate(
						dayjs(lastMonday).add(6, "day").format("YYYY-MM-DD"),
						language
					),
				})
			: undefined;

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
							hint={weeksLine}
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
										aria-describedby={describedBy(
											"month",
											weeksLine !== undefined
										)}
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
