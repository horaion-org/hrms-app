import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { RadioCard } from "@/components/forms/RadioCard";
import { Select } from "@/components/forms/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import type { TermsPresets } from "@/features/employmentTerms/api";
import { RateField } from "@/features/employmentTerms/EmploymentTermsDialog/RateField";
import {
	TermsFormPart,
	termsQuestionClasses,
} from "@/features/employmentTerms/EmploymentTermsDialog/TermsFormPart";
import { durationShort } from "@/features/employmentTerms/hours";
import { formatTimes, timesOfPercent } from "@/features/employmentTerms/rates";
import {
	hasDayOff,
	overtimeSentence,
	timeOffPerExtraHour,
} from "@/features/employmentTerms/summary";
import {
	overtimeRateAsked,
	weekFieldsOf,
	type TermsFormValues,
	type TypedWeek,
} from "@/features/employmentTerms/termsForm";

const key = "employmentTerms.dialog";
const DAY_OFF_MODES = ["NORMAL", "OWN_RATE"] as const;

export type ExtraHoursPaySectionProps = {
	form: UseFormReturn<TermsFormValues>;
	/** The form's answers as they stand. */
	values: TermsFormValues;
	/** The country's figures and starting points, once loaded. */
	presets: TermsPresets | undefined;
	/** The week the answers make (`typedWeekOf`). */
	week: TypedWeek;
	/** The id of one of the form's fields. */
	idOf: (field: string) => string;
	disabled: boolean;
	/** Called with each answer that may change the suggested name. */
	onAnswer: (next: Partial<TermsFormValues>) => void;
	className?: string;
};

/**
 * The dialog's second part, "Pay for extra hours": whether the Act's hour
 * rules cover the terms, when overtime starts, how extra hours are paid
 * (asked only outside the Act), then only the rates that apply.
 */
export const ExtraHoursPaySection = ({
	form,
	values,
	presets,
	week,
	idOf,
	disabled,
	onAnswer,
	className,
}: ExtraHoursPaySectionProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const {
		control,
		register,
		setValue,
		formState: { errors },
	} = form;
	const fields = weekFieldsOf(values);
	const payLines = presets?.coveredPayLines ?? null;
	const money = (amount: number): string =>
		payLines === null
			? String(amount)
			: new Intl.NumberFormat(formattingLocale(i18n), {
					style: "currency",
					currency: payLines.currency,
					maximumFractionDigits: 0,
				}).format(amount);
	// "Time off instead" is offered with the API's figure of time off per extra hour (owner decision 11).
	const timeOffPerHour =
		presets?.timeOffPerExtraHourPercent != null
			? timeOffPerExtraHour(presets.timeOffPerExtraHourPercent, t)
			: undefined;
	const paidAsChoices: ReadonlyArray<"RATE" | "TIME_OFF" | "NOTHING"> =
		timeOffPerHour === undefined
			? ["RATE", "NOTHING"]
			: ["RATE", "TIME_OFF", "NOTHING"];
	const minimumPercent = presets?.minimumCoveredOvertimePercent ?? null;
	const overtimeRateHint = values.hoursLimitsApply
		? minimumPercent === null
			? undefined
			: t(`${key}.overtimeRateHintCovered`, {
					minimum: timesOfPercent(minimumPercent),
				})
		: t(`${key}.overtimeRateHintNotCovered`);
	const usualRestDayPercent = presets?.usualRestDayWorkPercent ?? null;
	const restDayRateHint =
		usualRestDayPercent === null
			? undefined
			: t(`${key}.restDayRateHint`, {
					usual: timesOfPercent(usualRestDayPercent),
				});
	// The rate is asked whenever the Act's limits apply, otherwise only for extra hours paid at a rate.
	const rateAsked = overtimeRateAsked(values);
	const dayOffShown =
		rateAsked && fields !== undefined && hasDayOff(fields, week.partTime);
	// Overtime by the day is for full-timers on fixed days only.
	const dailyDayMinutes = week.partTime ? null : week.dayMinutes;
	const paidAsError = errors.extraHoursPaidAs?.message;
	const dayOffIds = formRowIds(idOf("dayOffMode"));
	const rateField = (
		name: "overtimeTimes" | "restDayTimes" | "dayOffTimes",
		label: string,
		hint: string | undefined
	): FunctionComponent => (
		<RateField
			disabled={disabled}
			error={errors[name]?.message}
			hint={hint}
			id={idOf(name)}
			label={label}
			registration={register(name)}
			unit={t(`${key}.timesUnit`)}
		/>
	);
	return (
		<TermsFormPart
			className={className}
			title={t(`${key}.parts.extraHoursPay`)}
		>
			<Controller
				control={control}
				name="hoursLimitsApply"
				render={({ field }) => (
					<fieldset className="flex min-w-0 flex-col">
						<legend className={termsQuestionClasses}>
							{t(`${key}.covered.question`)}
						</legend>
						<div className="flex flex-col gap-3" role="radiogroup">
							<RadioCard
								checked={field.value}
								disabled={disabled}
								label={t(`${key}.covered.yes`)}
								name={idOf("covered")}
								value="YES"
								description={
									payLines === null
										? t(`${key}.covered.yesDescriptionWithoutPay`)
										: t(`${key}.covered.yesDescription`, {
												workman: money(payLines.workmanMonthly),
												other: money(payLines.otherStaffMonthly),
											})
								}
								onChange={() => {
									field.onChange(true);
									// Covered staff are always paid at a rate, so the choice goes with the answer.
									setValue("extraHoursPaidAs", "RATE");
									onAnswer({ hoursLimitsApply: true, extraHoursPaidAs: "RATE" });
								}}
							/>
							<RadioCard
								checked={!field.value}
								description={t(`${key}.covered.noDescription`)}
								disabled={disabled}
								label={t(`${key}.covered.no`)}
								name={idOf("covered")}
								value="NO"
								onChange={() => {
									field.onChange(false);
									onAnswer({ hoursLimitsApply: false });
								}}
							/>
						</div>
					</fieldset>
				)}
			/>
			{presets === undefined ? (
				<p className="text-sm text-neutral-700">
					{t(`${key}.overtimeUnknown`)}
				</p>
			) : (
				fields && (
					<p className="text-sm font-medium text-neutral-900">
						{overtimeSentence(fields, presets, t)}
					</p>
				)
			)}
			{dailyDayMinutes !== null && (
				<Controller
					control={control}
					name="dailyOvertime"
					render={({ field }) => (
						<Checkbox
							checked={field.value}
							disabled={disabled}
							name={field.name}
							label={t(`${key}.dailyByDay`, {
								day: durationShort(dailyDayMinutes, t),
								week: durationShort(week.weekMinutes ?? 0, t),
							})}
							onBlur={field.onBlur}
							onChange={(event) => {
								field.onChange(event.target.checked);
							}}
						/>
					)}
				/>
			)}
			{!values.hoursLimitsApply && (
				<Controller
					control={control}
					name="extraHoursPaidAs"
					render={({ field }) => (
						<div className="flex min-w-0 flex-col">
							<p className={termsQuestionClasses} id={idOf("paidAsLegend")}>
								{t(`${key}.paidAs.legend`)}
							</p>
							<div
								aria-labelledby={idOf("paidAsLegend")}
								className="flex flex-col gap-3"
								role="radiogroup"
							>
								{paidAsChoices.map((choice) => (
									<RadioCard
										key={choice}
										checked={field.value === choice}
										disabled={disabled}
										label={t(`${key}.paidAs.${choice}`)}
										name={idOf("paidAs")}
										value={choice}
										description={
											choice === "TIME_OFF"
												? t(`${key}.paidAs.TIME_OFFDescription`, {
														time: timeOffPerHour ?? "",
													})
												: t(`${key}.paidAs.${choice}Description`)
										}
										onChange={() => {
											field.onChange(choice);
										}}
									/>
								))}
							</div>
						</div>
					)}
				/>
			)}
			{paidAsError && (
				<p className="text-sm text-error-700" role="alert">
					{paidAsError}
				</p>
			)}
			{rateAsked &&
				rateField("overtimeTimes", t(`${key}.overtimeRate`), overtimeRateHint)}
			{!week.partTime &&
				rateAsked &&
				rateField("restDayTimes", t(`${key}.restDayRate`), restDayRateHint)}
			{dayOffShown && (
				<FormRow
					hint={t(`${key}.dayOffHint`)}
					htmlFor={idOf("dayOffMode")}
					label={t(`${key}.dayOff`)}
					layout="stacked"
				>
					<Controller
						control={control}
						name="dayOffMode"
						render={({ field }) => (
							<Select
								ref={field.ref}
								aria-describedby={dayOffIds.hintId}
								aria-labelledby={dayOffIds.labelId}
								className="w-full"
								disabled={disabled}
								name={field.name}
								value={field.value}
								options={DAY_OFF_MODES.map((mode) => ({
									value: mode,
									label: t(`${key}.dayOffMode.${mode}`),
								}))}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormRow>
			)}
			{dayOffShown &&
				values.dayOffMode === "OWN_RATE" &&
				rateField("dayOffTimes", t(`${key}.dayOffRate`), undefined)}
			{week.partTime &&
				presets?.fullTimeWeekMinutes != null &&
				fields?.overtimePercent != null && (
					<p className="text-sm text-neutral-800">
						{t(`${key}.partTimeOvertimeNote`, {
							full: durationShort(presets.fullTimeWeekMinutes, t),
							times: formatTimes(fields.overtimePercent, t),
						})}
					</p>
				)}
		</TermsFormPart>
	);
};
