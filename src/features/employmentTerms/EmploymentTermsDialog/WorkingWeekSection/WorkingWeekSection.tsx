import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { isWeekday, WEEKDAYS } from "@/common/weekdays";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Textarea } from "@/components/forms/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Disclosure } from "@/components/ui/Disclosure";
import type { TermsPreset } from "@/features/employmentTerms/api";
import {
	TermsFormPart,
	termsQuestionClasses,
} from "@/features/employmentTerms/EmploymentTermsDialog/TermsFormPart";
import { durationShort, formatDays } from "@/features/employmentTerms/hours";
import { holdsPreset, presetLine } from "@/features/employmentTerms/startFrom";
import {
	DAYS_CHOICES,
	dayLineOf,
	TERMS_DESCRIPTION_MAX_LENGTH,
	TERMS_NAME_MAX_LENGTH,
	type TermsFormValues,
	type TypedWeek,
} from "@/features/employmentTerms/termsForm";

const key = "employmentTerms.dialog";
/** The rest-day choice that lets the roster pick the day; every other choice is a weekday. */
const ROSTERED = "ROSTERED";

/** The "Start from" buttons: the API's starting points and the one last pressed. */
export type StartFromChoices = {
	presets: ReadonlyArray<TermsPreset>;
	/** The starting points could not be loaded. */
	failed: boolean;
	startedFrom: TermsPreset | undefined;
	onStartFrom: (preset: TermsPreset) => void;
};

export type WorkingWeekSectionProps = {
	form: UseFormReturn<TermsFormValues>;
	/** The form's answers as they stand. */
	values: TermsFormValues;
	/** The week the answers make (`typedWeekOf`). */
	week: TypedWeek;
	startFrom: StartFromChoices;
	/** The company's part-time line, once loaded. */
	partTimeBelowMinutes: number | null;
	/** The id of one of the form's fields. */
	idOf: (field: string) => string;
	disabled: boolean;
	/** Called with each answer that may change the suggested name. */
	onAnswer: (next: Partial<TermsFormValues>) => void;
	/** Called once someone types a name, so it stops following the answers. */
	onNameTyped: () => void;
	className?: string;
};

/**
 * The dialog's first part, "Working week": a starting point, the days and
 * hours (the normal day worked out under them), the rest day, then the name
 * suggested from those answers and a description under More options.
 */
export const WorkingWeekSection = ({
	form,
	values,
	week,
	startFrom,
	partTimeBelowMinutes,
	idOf,
	disabled,
	onAnswer,
	onNameTyped,
	className,
}: WorkingWeekSectionProps): FunctionComponent => {
	const { t } = useTranslation();
	const {
		control,
		register,
		setValue,
		formState: { errors },
	} = form;
	const { startedFrom } = startFrom;
	const startedNote =
		startedFrom !== undefined && !holdsPreset(values, startedFrom)
			? t(`${key}.startFromChanged`)
			: t(`${key}.startFromNote`);
	// A days figure the form no longer offers (stored before the design's list) is still shown as itself.
	const dayChoices =
		week.days === null || DAYS_CHOICES.includes(week.days)
			? DAYS_CHOICES
			: [...DAYS_CHOICES.slice(0, -1), week.days, null];
	const daysError = errors.daysPerWeek?.message;
	const weekError = errors.weekHours?.message;
	const restError = errors.restWeekday?.message;
	const nameError = errors.name?.message;
	const descriptionError = errors.description?.message;
	const restChoice =
		values.restKind === "ROSTERED" ? ROSTERED : values.restWeekday;
	const chooseRest = (choice: string): void => {
		const rostered = choice === ROSTERED;
		setValue("restKind", rostered ? "ROSTERED" : "FIXED");
		if (!rostered && isWeekday(choice))
			setValue("restWeekday", choice, { shouldValidate: true });
		onAnswer(
			rostered
				? { restKind: "ROSTERED" }
				: { restKind: "FIXED", restWeekday: isWeekday(choice) ? choice : "" }
		);
	};
	return (
		<TermsFormPart className={className} title={t(`${key}.parts.workingWeek`)}>
			<fieldset className="flex min-w-0 flex-col gap-2">
				<legend className={termsQuestionClasses}>
					{t(`${key}.startFrom`)}
				</legend>
				{startFrom.failed ? (
					<p className="text-xs text-neutral-700">
						{t(`${key}.presetsFailed`)}
					</p>
				) : (
					<div className="flex flex-wrap gap-2">
						{startFrom.presets.map((preset) => (
							<Button
								key={preset.key}
								disabled={disabled}
								size="sm"
								variant="secondary"
								aria-pressed={
									startedFrom?.key === preset.key &&
									holdsPreset(values, preset)
								}
								onClick={() => {
									startFrom.onStartFrom(preset);
								}}
							>
								<span className="flex flex-col items-start leading-tight">
									<span>{preset.name}</span>
									<span className="text-xs font-normal text-neutral-700">
										{presetLine(preset, t)}
									</span>
								</span>
							</Button>
						))}
					</div>
				)}
				<p className="text-xs text-neutral-700">{startedNote}</p>
			</fieldset>
			<div className="flex flex-col gap-2">
				<div className="flex flex-wrap items-start gap-x-4 gap-y-5">
					<FormRow
						error={daysError}
						htmlFor={idOf("daysPerWeek")}
						label={t(`${key}.daysPerWeek`)}
						layout="stacked"
					>
						<Controller
							control={control}
							name="daysPerWeek"
							render={({ field }) => (
								<Select
									ref={field.ref}
									aria-invalid={Boolean(daysError)}
									aria-labelledby={formRowIds(idOf("daysPerWeek")).labelId}
									className="w-40"
									disabled={disabled}
									name={field.name}
									status={daysError ? "error" : undefined}
									value={field.value}
									options={dayChoices.map((choice) => ({
										value: choice === null ? "" : String(choice),
										label:
											choice === null
												? t(`${key}.daysVary`)
												: t(`${key}.daysOption`, {
														days: formatDays(choice),
														count: choice,
													}),
									}))}
									onChange={(next) => {
										field.onChange(next);
										onAnswer({ daysPerWeek: next });
									}}
								/>
							)}
						/>
					</FormRow>
					<FormRow
						error={weekError}
						htmlFor={idOf("weekHours")}
						label={t(`${key}.weekHours`)}
						layout="stacked"
					>
						<Input
							aria-invalid={Boolean(weekError)}
							className="w-24"
							disabled={disabled}
							id={idOf("weekHours")}
							inputMode="decimal"
							status={weekError ? "error" : undefined}
							aria-describedby={
								weekError
									? formRowIds(idOf("weekHours")).errorId
									: idOf("dayLine")
							}
							{...register("weekHours", {
								onChange: (event: { target: { value: string } }) => {
									onAnswer({ weekHours: event.target.value });
								},
							})}
						/>
					</FormRow>
				</div>
				<p
					className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-900"
					id={idOf("dayLine")}
				>
					{dayLineOf(week, t)}
					{week.weekMinutes !== null && partTimeBelowMinutes !== null && (
						<Badge>
							{t(`${key}.${week.partTime ? "partTimeBadge" : "fullTimeBadge"}`)}
						</Badge>
					)}
				</p>
				{partTimeBelowMinutes !== null && (
					<p className="text-xs text-neutral-600">
						{t(`${key}.partTimeLine`, {
							line: durationShort(partTimeBelowMinutes, t),
						})}
					</p>
				)}
			</div>
			{week.partTime ? (
				<p className="text-sm text-neutral-800">
					{t(`${key}.restPartTimeNote`)}
				</p>
			) : (
				<FormRow
					error={restError}
					hint={t(`${key}.restDayHint`)}
					htmlFor={idOf("restDay")}
					label={t(`${key}.restDay`)}
					layout="stacked"
				>
					<Select
						aria-invalid={Boolean(restError)}
						aria-labelledby={formRowIds(idOf("restDay")).labelId}
						className="w-full"
						disabled={disabled}
						status={restError ? "error" : undefined}
						value={restChoice}
						options={[
							...WEEKDAYS.map((day) => ({
								value: day,
								label: t(`weekdays.${day}`),
							})),
							{ value: ROSTERED, label: t(`${key}.restRosteredChoice`) },
						]}
						onChange={chooseRest}
					/>
				</FormRow>
			)}
			<FormRow
				counter={t(`${key}.nameCounter`, { count: values.name.length })}
				error={nameError}
				hint={t(`${key}.nameHint`)}
				htmlFor={idOf("name")}
				label={t(`${key}.name`)}
				layout="stacked"
			>
				<Input
					aria-invalid={Boolean(nameError)}
					className="w-full"
					disabled={disabled}
					id={idOf("name")}
					maxLength={TERMS_NAME_MAX_LENGTH}
					placeholder={t(`${key}.namePlaceholder`)}
					status={nameError ? "error" : undefined}
					aria-describedby={
						nameError
							? formRowIds(idOf("name")).errorId
							: formRowIds(idOf("name")).hintId
					}
					{...register("name", { onChange: onNameTyped })}
				/>
			</FormRow>
			<Disclosure
				defaultOpen={values.description !== ""}
				title={t(`${key}.moreOptions`)}
			>
				<FormRow
					error={descriptionError}
					htmlFor={idOf("description")}
					label={t(`${key}.descriptionLabel`)}
					layout="stacked"
					counter={t(`${key}.descriptionCounter`, {
						count: values.description.length,
					})}
				>
					<Textarea
						aria-invalid={Boolean(descriptionError)}
						disabled={disabled}
						id={idOf("description")}
						maxLength={TERMS_DESCRIPTION_MAX_LENGTH}
						placeholder={t(`${key}.descriptionPlaceholder`)}
						rows={2}
						status={descriptionError ? "error" : undefined}
						aria-describedby={
							descriptionError
								? formRowIds(idOf("description")).errorId
								: undefined
						}
						{...register("description")}
					/>
				</FormRow>
			</Disclosure>
		</TermsFormPart>
	);
};
