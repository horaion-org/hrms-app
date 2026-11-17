import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { isWeekday, WEEKDAYS } from "@/common/weekdays";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { RadioCard } from "@/components/forms/RadioCard";
import { Select } from "@/components/forms/Select";
import { Textarea } from "@/components/forms/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { Disclosure } from "@/components/ui/Disclosure";
import {
	termsPresetsQuery,
	type ApplyChange,
	type EmploymentTermsBody,
	type TermsOverviewItem,
	type TermsPreset,
} from "@/features/employmentTerms/api";
import { ApplyChangeStep } from "@/features/employmentTerms/ApplyChangeStep";
import {
	durationShort,
	formatDays,
	parseHours,
} from "@/features/employmentTerms/hours";
import { normalDayMinutes } from "@/features/employmentTerms/normalDay";
import { formatTimes, timesOfPercent } from "@/features/employmentTerms/rates";
import {
	applyChangeRefusal,
	isHeldRefusal,
	termsSaveRefusal,
} from "@/features/employmentTerms/refusals";
import {
	holdsPreset,
	presetLine,
	valuesOfPreset,
} from "@/features/employmentTerms/startFrom";
import {
	hasDayOff,
	isPartTimeWeek,
	overtimeSentence,
	suggestedTermsName,
	timeOffPerExtraHour,
} from "@/features/employmentTerms/summary";
import {
	needsApplyChoice,
	weekChanges,
} from "@/features/employmentTerms/termsChanges";
import {
	DAYS_CHOICES,
	overtimeRateAsked,
	parseDays,
	TERMS_DESCRIPTION_MAX_LENGTH,
	TERMS_NAME_MAX_LENGTH,
	termsBodyOf,
	termsFormSchema,
	termsFormValuesOf,
	weekFieldsOf,
	type TermsFormValues,
} from "@/features/employmentTerms/termsForm";
import { sampleWeek } from "@/features/employmentTerms/sampleWeek";
import {
	readBackOf,
	termsEffects,
	termsExample,
} from "@/features/employmentTerms/termsReadBack";
import { TermsSummary } from "@/features/employmentTerms/TermsSummary";
import { useEmploymentTermsActions } from "@/features/employmentTerms/useEmploymentTermsActions";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";

/** What a save did, for the list's confirmation. */
export type TermsSaved =
	| { kind: "added" | "saved"; name: string }
	| {
			kind: "changedFromDate";
			name: string;
			fromDate: string;
			/** How many people moved to the new terms. */
			moved: number;
			/** How many people's own hours were cleared, being above the new week. */
			ownHoursCleared: number;
	  };

export type EmploymentTermsDialogProps = {
	companyId: string;
	/** Set to edit terms; without it, new terms start from the first kind of week. */
	editing?: TermsOverviewItem;
	/** Opened from "Change from a date…": the save step starts on that choice. */
	preferFromDate?: boolean;
	onSaved: (saved: TermsSaved) => void;
	onClose: () => void;
};

const FIELDS = [
	"name",
	"description",
	"daysPerWeek",
	"weekHours",
	"restWeekday",
	"overtimeTimes",
	"extraHoursPaidAs",
	"restDayTimes",
	"dayOffTimes",
] as const;

const key = "employmentTerms.dialog";
/** The rest-day choice that lets the roster pick the day; every other choice is a weekday. */
const ROSTERED = "ROSTERED";
/**
 * The terms form takes a wide panel (880 px, 1040 px from `lg`), so the form
 * and its read-back sit side by side; on a phone the read-back follows it.
 */
const WIDE_DIALOG_CLASSES = "sm:max-w-220 lg:max-w-260";
/** The heading of each of the form's groups. */
const legendClasses = "mb-3 text-base font-semibold text-neutral-900";

type TermsFormProps = {
	companyId: string;
	editing?: TermsOverviewItem;
	/** Values to come back to from the save step. */
	initial?: EmploymentTermsBody;
	/** Whether saving these values first asks how the change applies. */
	needsChoice: (body: EmploymentTermsBody) => boolean;
	/** Moves on to that question with the values. */
	onChoose: (body: EmploymentTermsBody) => void;
	/** Saves straight away; a refusal stays in the form. */
	onSave: (body: EmploymentTermsBody) => Promise<void>;
	/** Opened from "Change from a date…": saving needs a changed working week. */
	fromDateOnly?: boolean;
	onClose: () => void;
};

/**
 * The terms form, in the approved design's order: Start from, the working
 * week (hours a day worked out), whether the Act's hour rules cover them,
 * overtime and its rates, the name, and More options for a description.
 * Beside it, "These terms in words" reads the form back at every keystroke.
 */
const TermsForm = ({
	companyId,
	editing,
	initial,
	needsChoice,
	onChoose,
	onSave,
	fromDateOnly = false,
	onClose,
}: TermsFormProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const [unchangedWeek, setUnchangedWeek] = useState(false);
	const language = formattingLocale(i18n);
	const formId = useId();
	const idOf = (field: string): string => `${formId}-${field}`;
	// The country's figures (part-time line, longest normal day, the Act's rates) and the starting points.
	const presets = useQuery(termsPresetsQuery(companyId));
	const reference = presets.data;
	const presetList = useMemo(() => presets.data?.presets ?? [], [presets.data]);
	const partTimeBelowMinutes = presets.data?.partTimeBelowMinutes ?? null;
	const maxDayMinutes = presets.data?.maxNormalDayMinutes ?? null;
	const minimumCoveredOvertimePercent =
		presets.data?.minimumCoveredOvertimePercent ?? null;
	// The name follows the answers until someone types one; existing terms keep theirs.
	const [nameTyped, setNameTyped] = useState(
		editing !== undefined || initial !== undefined
	);
	// The starting point last clicked (new terms start from the first); it steps aside once an answer differs.
	const [startedFromKey, setStartedFromKey] = useState<string>();
	const isNew = editing === undefined && initial === undefined;
	const schema = useMemo(
		() => termsFormSchema(t, { maxDayMinutes, minimumCoveredOvertimePercent }),
		[t, maxDayMinutes, minimumCoveredOvertimePercent]
	);
	const form = useForm<TermsFormValues>({
		resolver: zodResolver(schema),
		defaultValues: termsFormValuesOf(initial ?? editing),
		// A field is checked as soon as it is left, so a wrong value is said at the field at once.
		mode: "onTouched",
		reValidateMode: "onChange",
	});
	const {
		register,
		control,
		handleSubmit,
		reset,
		setValue,
		formState: { errors, isSubmitting },
	} = form;
	const values = useWatch({ control }) as TermsFormValues;
	const fields = weekFieldsOf(values);
	// Destructured, as the constraint and shift dialogs do, so the alert's ref is never read during render.
	const {
		message: submitMessage,
		alertRef,
		close,
		run,
	} = useCreateFormSubmit(form, FIELDS, onClose);
	const held = (editing?.holderCount ?? 0) + (editing?.scheduledCount ?? 0);
	const readBack = readBackOf(values, reference, t, language);

	const startedFrom = presetList.find(
		(preset) =>
			preset.key ===
			(startedFromKey ?? (isNew ? presetList[0]?.key : undefined))
	);
	// Fills the form from a starting point; the name follows unless one was typed.
	const fillFrom = (preset: TermsPreset): void => {
		const next = valuesOfPreset(preset, values);
		reset(next);
		const week = weekFieldsOf(next);
		if (!nameTyped && week)
			setValue("name", suggestedTermsName(week, partTimeBelowMinutes, t));
	};
	const startFrom = (preset: TermsPreset): void => {
		fillFrom(preset);
		setStartedFromKey(preset.key);
	};
	// New terms start from the first starting point once the figures arrive, so the form is never blank.
	const started = useRef(editing !== undefined || initial !== undefined);
	useEffect(() => {
		if (started.current || presetList.length === 0) return;
		started.current = true;
		const [first] = presetList;
		if (first) fillFrom(first);
		// fillFrom reads the form as it is now; it runs once, when the presets arrive.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [presetList]);

	const followAnswers = (next: Partial<TermsFormValues>): void => {
		if (nameTyped) return;
		const week = weekFieldsOf({ ...values, ...next });
		if (week)
			setValue("name", suggestedTermsName(week, partTimeBelowMinutes, t));
	};
	const typedDays = parseDays(values.daysPerWeek);
	const typedWeek = parseHours(values.weekHours);
	const weekMinutes = typedWeek.kind === "minutes" ? typedWeek.minutes : null;
	const days = typeof typedDays === "number" ? typedDays : null;
	const dayMinutes = normalDayMinutes(days, weekMinutes);
	const partTime =
		weekMinutes !== null && isPartTimeWeek(weekMinutes, partTimeBelowMinutes);
	// Overtime by the day is for full-timers on fixed days only.
	const dailyShown = !partTime && dayMinutes !== null;
	const startedNote =
		startedFrom !== undefined && !holdsPreset(values, startedFrom)
			? t(`${key}.startFromChanged`)
			: t(`${key}.startFromNote`);
	const dayLine =
		weekMinutes === null
			? undefined
			: days === null
				? t(`${key}.dayLineVaries`)
				: dayMinutes === null
					? undefined
					: days % 1 === 0
						? t(`${key}.dayLine`, { day: durationShort(dayMinutes, t) })
						: t(`${key}.dayLineHalf`, {
								day: durationShort(dayMinutes, t),
								half: durationShort(Math.floor(dayMinutes / 2), t),
							});
	// A days figure the form no longer offers (stored before the design's list) is still shown as itself.
	const dayChoices =
		days === null || DAYS_CHOICES.includes(days)
			? DAYS_CHOICES
			: [...DAYS_CHOICES.slice(0, -1), days, null];
	const payLines = reference?.coveredPayLines ?? null;
	const money = (amount: number): string =>
		payLines === null
			? String(amount)
			: new Intl.NumberFormat(language, {
					style: "currency",
					currency: payLines.currency,
					maximumFractionDigits: 0,
				}).format(amount);
	const weekError = errors.weekHours?.message;
	const nameError = errors.name?.message;
	const descriptionError = errors.description?.message;
	const restError = errors.restWeekday?.message;
	const daysError = errors.daysPerWeek?.message;
	const paidAsError = errors.extraHoursPaidAs?.message;
	// "Time off instead" is offered with the API's figure of time off per extra hour (owner decision 11).
	const timeOffPerHour =
		reference?.timeOffPerExtraHourPercent != null
			? timeOffPerExtraHour(reference.timeOffPerExtraHourPercent, t)
			: undefined;
	const paidAsChoices: ReadonlyArray<"RATE" | "TIME_OFF" | "NOTHING"> =
		timeOffPerHour === undefined
			? ["RATE", "NOTHING"]
			: ["RATE", "TIME_OFF", "NOTHING"];
	const restChoice =
		values.restKind === "ROSTERED" ? ROSTERED : values.restWeekday;
	const chooseRest = (choice: string): void => {
		const rostered = choice === ROSTERED;
		setValue("restKind", rostered ? "ROSTERED" : "FIXED");
		if (!rostered && isWeekday(choice))
			setValue("restWeekday", choice, { shouldValidate: true });
		followAnswers(
			rostered
				? { restKind: "ROSTERED" }
				: { restKind: "FIXED", restWeekday: isWeekday(choice) ? choice : "" }
		);
	};
	// A rate field: the figure in times a normal hour, its hint under it.
	const rateField = (
		name: "overtimeTimes" | "restDayTimes" | "dayOffTimes",
		label: string,
		hint: string | undefined
	): ReactNode => {
		const error = errors[name]?.message;
		const ids = formRowIds(idOf(name));
		return (
			<FormRow
				error={error}
				hint={hint}
				htmlFor={idOf(name)}
				label={label}
				layout="stacked"
			>
				<Input
					aria-describedby={error ? ids.errorId : hint ? ids.hintId : undefined}
					aria-invalid={Boolean(error)}
					className="w-full sm:w-40"
					disabled={isSubmitting}
					id={idOf(name)}
					inputMode="decimal"
					status={error ? "error" : undefined}
					unit={t(`${key}.timesUnit`)}
					{...register(name)}
				/>
			</FormRow>
		);
	};
	// The rate is asked whenever the Act's limits apply, otherwise only for extra hours paid at a rate.
	const rateAsked = overtimeRateAsked(values);
	const dayOffShown =
		rateAsked && fields !== undefined && hasDayOff(fields, partTime);
	const overtimeRateHint = values.hoursLimitsApply
		? minimumCoveredOvertimePercent === null
			? undefined
			: t(`${key}.overtimeRateHintCovered`, {
					minimum: timesOfPercent(minimumCoveredOvertimePercent),
				})
		: t(`${key}.overtimeRateHintNotCovered`);
	const usualRestDayWorkPercent = presets.data?.usualRestDayWorkPercent ?? null;
	const restDayRateHint =
		usualRestDayWorkPercent === null
			? undefined
			: t(`${key}.restDayRateHint`, {
					usual: timesOfPercent(usualRestDayWorkPercent),
				});
	const formMessage =
		submitMessage ?? (unchangedWeek ? t(`${key}.weekUnchanged`) : undefined);
	return (
		<Dialog
			open
			className={WIDE_DIALOG_CLASSES}
			preventClose={isSubmitting}
			title={t(editing ? `${key}.editTitle` : `${key}.addTitle`)}
			description={
				editing
					? [
							t(`${key}.editDescription`, { name: editing.name }),
							// Who holds them is said here, so the form keeps its room.
							...(held > 0 ? [t(`${key}.held`, { count: held })] : []),
						].join(" ")
					: t(`${key}.addDescription`)
			}
			footer={
				<div className="flex justify-end gap-3">
					<Button disabled={isSubmitting} variant="secondary" onClick={close}>
						{t(`${key}.cancel`)}
					</Button>
					<Button form={formId} loading={isSubmitting} type="submit">
						{t(editing ? `${key}.save` : `${key}.add`)}
					</Button>
				</div>
			}
			onClose={close}
		>
			<div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
				<form
					noValidate
					aria-busy={isSubmitting}
					className="flex flex-col gap-6"
					id={formId}
					onSubmit={(event) =>
						handleSubmit(async (submitted) => {
							const body = termsBodyOf(submitted);
							// "Change from a date…" with the same week has nothing to change from a date.
							const sameWeek =
								fromDateOnly &&
								editing !== undefined &&
								!weekChanges(editing, body);
							setUnchangedWeek(sameWeek);
							if (sameWeek) return;
							if (needsChoice(body)) {
								onChoose(body);
								return;
							}
							await run(
								() => onSave(body),
								(error) => {
									if (!isHeldRefusal(error))
										return termsSaveRefusal(error, submitted.name, t);
									onChoose(body);
									return { fields: {}, refreshMembers: false };
								}
							);
						})(event)
					}
				>
					{formMessage && (
						<p
							ref={alertRef}
							className="text-sm text-error-700"
							role="alert"
							tabIndex={-1}
						>
							{formMessage}
						</p>
					)}
					<fieldset className="flex flex-col gap-2">
						<legend className={legendClasses}>{t(`${key}.startFrom`)}</legend>
						{presets.isError ? (
							<p className="text-xs text-neutral-700">
								{t(`${key}.presetsFailed`)}
							</p>
						) : (
							<div className="flex flex-wrap gap-2">
								{presetList.map((preset) => (
									<Button
										key={preset.key}
										disabled={isSubmitting}
										size="sm"
										variant="secondary"
										aria-pressed={
											startedFrom?.key === preset.key &&
											holdsPreset(values, preset)
										}
										onClick={() => {
											startFrom(preset);
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
					<fieldset className="flex flex-col gap-4">
						<legend className={legendClasses}>{t(`${key}.workingWeek`)}</legend>
						<div className="grid gap-4 sm:grid-cols-2">
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
											className="w-full"
											disabled={isSubmitting}
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
												followAnswers({ daysPerWeek: next });
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
									className="w-full"
									disabled={isSubmitting}
									id={idOf("weekHours")}
									inputMode="decimal"
									status={weekError ? "error" : undefined}
									unit={t(`${key}.weekHoursUnit`)}
									aria-describedby={
										weekError
											? formRowIds(idOf("weekHours")).errorId
											: idOf("dayLine")
									}
									{...register("weekHours", {
										onChange: (event: { target: { value: string } }) => {
											followAnswers({ weekHours: event.target.value });
										},
									})}
								/>
							</FormRow>
						</div>
						<p
							className="flex flex-wrap items-center gap-2 text-sm text-neutral-800"
							id={idOf("dayLine")}
						>
							{dayLine}
							{weekMinutes !== null && partTimeBelowMinutes !== null && (
								<Badge>
									{t(`${key}.${partTime ? "partTimeBadge" : "fullTimeBadge"}`)}
								</Badge>
							)}
						</p>
						{partTimeBelowMinutes !== null && (
							<p className="text-xs text-neutral-700">
								{t(`${key}.partTimeLine`, {
									line: durationShort(partTimeBelowMinutes, t),
								})}
							</p>
						)}
						{partTime ? (
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
									disabled={isSubmitting}
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
					</fieldset>
					<Controller
						control={control}
						name="hoursLimitsApply"
						render={({ field }) => (
							<fieldset className="flex flex-col gap-3">
								<legend className={legendClasses}>
									{t(`${key}.covered.question`)}
								</legend>
								<div className="flex flex-col gap-3" role="radiogroup">
									<RadioCard
										checked={field.value}
										disabled={isSubmitting}
										label={t(`${key}.covered.yes`)}
										name={`${formId}-covered`}
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
											followAnswers({
												hoursLimitsApply: true,
												extraHoursPaidAs: "RATE",
											});
										}}
									/>
									<RadioCard
										checked={!field.value}
										description={t(`${key}.covered.noDescription`)}
										disabled={isSubmitting}
										label={t(`${key}.covered.no`)}
										name={`${formId}-covered`}
										value="NO"
										onChange={() => {
											field.onChange(false);
											followAnswers({ hoursLimitsApply: false });
										}}
									/>
								</div>
							</fieldset>
						)}
					/>
					<fieldset className="flex flex-col gap-3">
						<legend className={legendClasses}>{t(`${key}.overtime`)}</legend>
						{reference === undefined ? (
							<p className="text-sm text-neutral-700">
								{t(`${key}.overtimeUnknown`)}
							</p>
						) : (
							fields && (
								<p className="text-sm text-neutral-800">
									{overtimeSentence(fields, reference, t)}
								</p>
							)
						)}
						{dailyShown && (
							<Controller
								control={control}
								name="dailyOvertime"
								render={({ field }) => (
									<Checkbox
										checked={field.value}
										disabled={isSubmitting}
										name={field.name}
										label={t(`${key}.dailyByDay`, {
											day: durationShort(dayMinutes, t),
											week: durationShort(weekMinutes ?? 0, t),
										})}
										onBlur={field.onBlur}
										onChange={(event) => {
											field.onChange(event.target.checked);
										}}
									/>
								)}
							/>
						)}
						{rateAsked &&
							rateField(
								"overtimeTimes",
								t(`${key}.overtimeRate`),
								overtimeRateHint
							)}
						{!values.hoursLimitsApply && (
							<Controller
								control={control}
								name="extraHoursPaidAs"
								render={({ field }) => (
									<div
										aria-label={t(`${key}.paidAs.legend`)}
										className="flex flex-col gap-3"
										role="radiogroup"
									>
										{paidAsChoices.map((choice) => (
											<RadioCard
												key={choice}
												checked={field.value === choice}
												disabled={isSubmitting}
												label={t(`${key}.paidAs.${choice}`)}
												name={`${formId}-paidAs`}
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
								)}
							/>
						)}
						{paidAsError && (
							<p className="text-sm text-error-700" role="alert">
								{paidAsError}
							</p>
						)}
						{!partTime &&
							rateAsked &&
							rateField(
								"restDayTimes",
								t(`${key}.restDayRate`),
								restDayRateHint
							)}
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
											aria-describedby={formRowIds(idOf("dayOffMode")).hintId}
											aria-labelledby={formRowIds(idOf("dayOffMode")).labelId}
											className="w-full"
											disabled={isSubmitting}
											name={field.name}
											value={field.value}
											options={(["NORMAL", "OWN_RATE"] as const).map(
												(mode) => ({
													value: mode,
													label: t(`${key}.dayOffMode.${mode}`),
												})
											)}
											onChange={field.onChange}
										/>
									)}
								/>
							</FormRow>
						)}
						{dayOffShown &&
							values.dayOffMode === "OWN_RATE" &&
							rateField("dayOffTimes", t(`${key}.dayOffRate`), undefined)}
						{partTime &&
							reference?.fullTimeWeekMinutes != null &&
							fields?.overtimePercent != null && (
								<p className="text-sm text-neutral-800">
									{t(`${key}.partTimeOvertimeNote`, {
										full: durationShort(reference.fullTimeWeekMinutes, t),
										times: formatTimes(fields.overtimePercent, t),
									})}
								</p>
							)}
					</fieldset>
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
							disabled={isSubmitting}
							id={idOf("name")}
							maxLength={TERMS_NAME_MAX_LENGTH}
							placeholder={t(`${key}.namePlaceholder`)}
							status={nameError ? "error" : undefined}
							aria-describedby={
								nameError
									? formRowIds(idOf("name")).errorId
									: formRowIds(idOf("name")).hintId
							}
							{...register("name", {
								onChange: () => {
									setNameTyped(true);
								},
							})}
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
								disabled={isSubmitting}
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
				</form>
				<TermsSummary
					className="md:self-start"
					effects={fields ? termsEffects(fields, reference, t) : []}
					example={fields ? termsExample(fields, reference, t) : undefined}
					readBack={readBack}
					sampleWeek={
						fields
							? sampleWeek({
									daysPerWeek: fields.daysPerWeek,
									weekMinutes: fields.weekMinutes,
									dayMinutes: fields.dayMinutes,
									restDay: fields.restDay,
									partTime,
								})
							: undefined
					}
				/>
			</div>
		</Dialog>
	);
};

/**
 * Adds or edits employment terms: "Start from" buttons (the API's presets)
 * that fill the form once, the working week, the Act's hour rules, overtime
 * and its rates, a name suggested from the answers until one is typed, and a
 * description under More options. "These terms in words" reads the form back
 * as it changes. Saving held terms with a different week asks how the change
 * applies (`ApplyChangeStep`). Mount when opened.
 */
export const EmploymentTermsDialog = ({
	companyId,
	editing,
	preferFromDate,
	onSaved,
	onClose,
}: EmploymentTermsDialogProps): FunctionComponent => {
	const [pending, setPending] = useState<EmploymentTermsBody>();
	const [applyProblem, setApplyProblem] = useState<string>();
	const { t } = useTranslation();
	const actions = useEmploymentTermsActions(companyId);
	const applying =
		actions.correct.isPending || actions.changeFromDate.isPending;
	const refused = (error: unknown, newName?: string): void => {
		setApplyProblem(applyChangeRefusal(error, newName, t));
	};
	if (editing && pending)
		return (
			<ApplyChangeStep
				currentName={editing.name}
				isDefault={editing.isDefault}
				next={pending}
				peopleCount={editing.holderCount + editing.scheduledCount}
				preferFromDate={preferFromDate}
				problem={applyProblem}
				saving={applying}
				onClose={onClose}
				onApply={(apply: ApplyChange) => {
					setApplyProblem(undefined);
					if (apply.mode === "CORRECT") {
						actions.correct.mutate(
							{ termsId: editing.id, body: pending, correctForEveryone: true },
							{
								onSuccess: (terms) => {
									onSaved({ kind: "saved", name: terms.name });
									onClose();
								},
								onError: (error) => {
									refused(error);
								},
							}
						);
						return;
					}
					// The form's name, when changed, renames the terms left behind; the new ones take the step's name.
					const renamed = pending.name !== editing.name;
					actions.changeFromDate.mutate(
						{
							termsId: editing.id,
							startsOn: apply.startsOn,
							newTerms: { ...pending, name: apply.newName },
							...(renamed ? { previousTermsName: pending.name } : {}),
						},
						{
							onSuccess: (change) => {
								onSaved({
									kind: "changedFromDate",
									name: change.newTerms.name,
									fromDate: apply.startsOn,
									moved: change.moved,
									ownHoursCleared: change.ownHoursCleared,
								});
								onClose();
							},
							onError: (error) => {
								refused(error, apply.newName);
							},
						}
					);
				}}
				onBack={() => {
					setApplyProblem(undefined);
					setPending(undefined);
				}}
			/>
		);
	return (
		<TermsForm
			companyId={companyId}
			editing={editing}
			fromDateOnly={preferFromDate}
			initial={pending}
			needsChoice={(body) =>
				editing !== undefined && needsApplyChoice(editing, body)
			}
			onChoose={setPending}
			onClose={onClose}
			onSave={async (body) => {
				if (editing) {
					const terms = await actions.correct.mutateAsync({
						termsId: editing.id,
						body,
					});
					onSaved({ kind: "saved", name: terms.name });
					return;
				}
				const created = await actions.create.mutateAsync(body);
				onSaved({ kind: "added", name: created.name });
			}}
		/>
	);
};
