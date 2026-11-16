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
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { isWeekday, WEEKDAYS } from "@/common/weekdays";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { RadioCard } from "@/components/forms/RadioCard";
import { Select } from "@/components/forms/Select";
import { Textarea } from "@/components/forms/Textarea";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { Disclosure } from "@/components/ui/Disclosure";
import {
	termsPresetsQuery,
	type ApplyChange,
	type EmploymentTermsBody,
	type TermsOverviewItem,
} from "@/features/employmentTerms/api";
import { ApplyChangeStep } from "@/features/employmentTerms/ApplyChangeStep";
import {
	durationLong,
	formatDays,
	parseHours,
} from "@/features/employmentTerms/hours";
import {
	applyChangeRefusal,
	isHeldRefusal,
	termsSaveRefusal,
} from "@/features/employmentTerms/refusals";
import {
	overtimeSentence,
	suggestedTermsName,
} from "@/features/employmentTerms/summary";
import {
	needsApplyChoice,
	weekChanges,
} from "@/features/employmentTerms/termsChanges";
import {
	DAYS_CHOICES,
	TERMS_DESCRIPTION_MAX_LENGTH,
	TERMS_NAME_MAX_LENGTH,
	termsBodyOf,
	termsFormSchema,
	termsFormValuesOf,
	weekFieldsOf,
	type TermsFormValues,
} from "@/features/employmentTerms/termsForm";
import {
	kindDescription,
	kindLabel,
	kindOf,
	presetOfKind,
	TERMS_KINDS,
	valuesForKind,
	type TermsKind,
} from "@/features/employmentTerms/termsKinds";
import { readBackOf } from "@/features/employmentTerms/termsReadBack";
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
	"dayHours",
	"weekHours",
	"restWeekday",
] as const;
const key = "employmentTerms.dialog";
/** The rest-day choice that lets the roster pick the day; every other choice is a weekday. */
const ROSTERED = "ROSTERED";
/**
 * The terms form takes a wide panel (880 px, 1040 px from `lg`), so the kind,
 * the hours and the days sit side by side and the form fits a screen.
 */
const WIDE_DIALOG_CLASSES = "sm:max-w-220 lg:max-w-260";
const kindsKey = "employmentTerms.kinds";
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
 * The terms form, in the wide panel: the kind of week first; then the name
 * and Hours beside Days and rest, Overtime and More options. "These terms in
 * words" sits in the footer beside the buttons, true at every keystroke and
 * never over a field.
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
	// The country's figures (part-time line, longest normal day) and the weeks the kinds start from.
	const presets = useQuery(termsPresetsQuery(companyId));
	const reference = presets.data;
	const presetList = useMemo(() => presets.data?.presets ?? [], [presets.data]);
	const partTimeBelowMinutes = presets.data?.partTimeBelowMinutes ?? null;
	const maxDayMinutes = presets.data?.maxNormalDayMinutes ?? null;
	// The name follows the week until someone types one; existing terms keep theirs.
	const [nameTyped, setNameTyped] = useState(
		editing !== undefined || initial !== undefined
	);
	const schema = useMemo(
		() => termsFormSchema(t, { maxDayMinutes }),
		[t, maxDayMinutes]
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
	const kind = kindOf(values, presetList, partTimeBelowMinutes);
	const readBack = readBackOf(values, reference, t, language);
	// More options opens itself when what it holds already differs from the default.
	const [moreOptionsOpen] = useState(
		!values.hoursLimitsApply || values.description !== ""
	);

	const chooseKind = (choice: Exclude<TermsKind, "CUSTOM">): void => {
		const preset = presetOfKind(choice, presetList);
		if (!preset) return;
		const next = valuesForKind(preset, values);
		reset(next);
		const week = weekFieldsOf(next);
		if (!nameTyped && week)
			setValue("name", suggestedTermsName(week, partTimeBelowMinutes, t));
	};
	// New terms start from the first kind once its figures arrive, so the form is never blank.
	const started = useRef(editing !== undefined || initial !== undefined);
	useEffect(() => {
		if (started.current || presetList.length === 0) return;
		started.current = true;
		const first = TERMS_KINDS.find((each) => presetOfKind(each, presetList));
		if (first) chooseKind(first);
		// chooseKind reads the form as it is now; it runs once, when the presets arrive.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [presetList]);

	const followWeek = (next: Partial<TermsFormValues>): void => {
		if (nameTyped) return;
		const week = weekFieldsOf({ ...values, ...next });
		if (week)
			setValue("name", suggestedTermsName(week, partTimeBelowMinutes, t));
	};
	// The two hours sit side by side; their hints share one line under them, so the pair stays short.
	const hoursField = (
		name: "dayHours" | "weekHours",
		label: string,
		unit: string
	): ReactNode => {
		const error = errors[name]?.message;
		const ids = formRowIds(idOf(name));
		return (
			<FormRow
				error={error}
				htmlFor={idOf(name)}
				label={label}
				layout="stacked"
			>
				<Input
					aria-describedby={error ? ids.errorId : idOf("hoursHint")}
					aria-invalid={Boolean(error)}
					className="w-full"
					disabled={isSubmitting}
					id={idOf(name)}
					inputMode="decimal"
					status={error ? "error" : undefined}
					unit={unit}
					{...register(name, {
						onChange: (event: { target: { value: string } }) => {
							followWeek({ [name]: event.target.value });
						},
					})}
				/>
			</FormRow>
		);
	};
	const partTime = kind === "PART_TIME";
	const dayField = values.shiftWork
		? hoursField(
				"dayHours",
				t(`${key}.longestShift`),
				t(`${key}.longestShiftUnit`)
			)
		: hoursField(
				"dayHours",
				t(values.dailyOvertime ? `${key}.dayHours` : `${key}.dayHoursOptional`),
				t(`${key}.dayHoursUnit`)
			);
	const dayHint = t(
		values.shiftWork ? `${key}.longestShiftHint` : `${key}.hoursFormatHint`
	);
	const weekHint =
		partTimeBelowMinutes === null
			? t(`${key}.weekHoursHint`)
			: t(`${key}.weekHoursHintPartTime`, {
					line: durationLong(partTimeBelowMinutes, t),
				});
	// Read from the day field itself, so the line stays true while only the week is unfinished.
	const typedDay = parseHours(values.dayHours);
	const dailyOvertimeDescription =
		typedDay.kind !== "minutes"
			? t(`${key}.dailyOvertimeNeedsDay`)
			: fields
				? t(`${key}.dailyOvertimeDescription`, {
						day: durationLong(typedDay.minutes, t),
						week: durationLong(fields.weekMinutes, t),
					})
				: t(`${key}.dailyOvertimeDescriptionDayOnly`, {
						day: durationLong(typedDay.minutes, t),
					});
	const nameError = errors.name?.message;
	const descriptionError = errors.description?.message;
	const restError = errors.restWeekday?.message;
	const daysError = errors.daysPerWeek?.message;
	const restChoice =
		values.restKind === "ROSTERED" ? ROSTERED : values.restWeekday;
	const chooseRest = (choice: string): void => {
		const rostered = choice === ROSTERED;
		setValue("restKind", rostered ? "ROSTERED" : "FIXED");
		if (!rostered && isWeekday(choice))
			setValue("restWeekday", choice, { shouldValidate: true });
		followWeek(
			rostered
				? { restKind: "ROSTERED" }
				: { restKind: "FIXED", restWeekday: isWeekday(choice) ? choice : "" }
		);
	};
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
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
					<TermsSummary className="min-w-0 flex-1" readBack={readBack} />
					<div className="grid shrink-0 grid-cols-[auto_1fr] gap-3 sm:flex">
						<Button
							disabled={isSubmitting}
							variant="secondary"
							onClick={close}
						>
							{t(`${key}.cancel`)}
						</Button>
						<Button form={formId} loading={isSubmitting} type="submit">
							{t(editing ? `${key}.save` : `${key}.add`)}
						</Button>
					</div>
				</div>
			}
			onClose={close}
		>
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
					<legend className={legendClasses}>{t(`${kindsKey}.legend`)}</legend>
					{(presets.isError || editing) && (
						<p className="text-xs text-neutral-700">
							{presets.isError
								? t(`${key}.presetsFailed`)
								: t(`${kindsKey}.replaces`)}
						</p>
					)}
					<div
						className={joinClassNames(
							"grid grid-cols-2 gap-3",
							kind === "CUSTOM" ? "lg:grid-cols-5" : "lg:grid-cols-4"
						)}
					>
						{TERMS_KINDS.map((each) => {
							const preset = presetOfKind(each, presetList);
							return (
								<RadioCard
									key={each}
									checked={kind === each}
									description={kindDescription(each, preset, reference, t)}
									disabled={isSubmitting || !preset}
									label={kindLabel(each, preset, t)}
									name={`${formId}-kind`}
									value={each}
									onChange={() => {
										chooseKind(each);
									}}
								/>
							);
						})}
						{kind === "CUSTOM" && (
							<RadioCard
								checked
								description={t(`${kindsKey}.customDescription`)}
								disabled={isSubmitting}
								label={t(`${kindsKey}.CUSTOM`)}
								name={`${formId}-kind`}
								value="CUSTOM"
								onChange={() => undefined}
							/>
						)}
					</div>
				</fieldset>
				<div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
					<div className="flex flex-col gap-6">
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
						<fieldset className="flex flex-col gap-4">
							<legend className={legendClasses}>{t(`${key}.hours`)}</legend>
							<div className="grid gap-4 sm:grid-cols-2">
								{hoursField(
									"weekHours",
									t(`${key}.weekHours`),
									t(`${key}.weekHoursUnit`)
								)}
								{dayField}
							</div>
							<p className="text-xs text-neutral-700" id={idOf("hoursHint")}>
								{`${weekHint} ${dayHint}`}
							</p>
						</fieldset>
					</div>
					<div className="flex flex-col gap-6 md:row-span-2">
						<fieldset className="flex flex-col gap-4">
							<legend className={legendClasses}>
								{t(`${key}.daysAndRest`)}
							</legend>
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
												aria-describedby={idOf("daysHint")}
												aria-invalid={Boolean(daysError)}
												className="w-full"
												disabled={isSubmitting}
												name={field.name}
												status={daysError ? "error" : undefined}
												value={field.value}
												aria-labelledby={
													formRowIds(idOf("daysPerWeek")).labelId
												}
												options={DAYS_CHOICES.map((days) => ({
													value: days === null ? "" : String(days),
													label:
														days === null
															? t(`${key}.daysVary`)
															: t(`${key}.daysOption`, {
																	days: formatDays(days),
																	count: days,
																}),
												}))}
												onChange={(next) => {
													field.onChange(next);
													followWeek({ daysPerWeek: next });
												}}
											/>
										)}
									/>
								</FormRow>
								{partTime ? (
									<div>
										<p className="text-sm font-semibold text-neutral-900">
											{t(`${key}.restDay`)}
										</p>
										<p className="mt-1 text-sm text-neutral-800">
											{t(`${key}.restPartTime`)}
										</p>
									</div>
								) : (
									<FormRow
										error={restError}
										htmlFor={idOf("restDay")}
										label={t(`${key}.restDay`)}
										layout="stacked"
									>
										<Select
											aria-describedby={idOf("daysHint")}
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
												{ value: ROSTERED, label: t(`${key}.restRostered`) },
											]}
											onChange={chooseRest}
										/>
									</FormRow>
								)}
							</div>
							<p className="text-xs text-neutral-700" id={idOf("daysHint")}>
								{partTime
									? t(`${key}.daysHint`)
									: `${t(`${key}.daysHint`)} ${t(
											restChoice === ROSTERED
												? `${key}.restRosteredDescription`
												: `${key}.restFixedDescription`
										)}`}
							</p>
						</fieldset>
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
							{values.shiftWork ? (
								// The overtime line above already says shift work counts by the week, when it can be read.
								(reference === undefined || !fields) && (
									<p className="text-sm text-neutral-800">
										{t(`${key}.shiftNoDailyNote`)}
									</p>
								)
							) : (
								<Controller
									control={control}
									name="dailyOvertime"
									render={({ field }) => (
										<Checkbox
											checked={field.value}
											description={dailyOvertimeDescription}
											disabled={isSubmitting}
											label={t(`${key}.dailyOvertime`)}
											name={field.name}
											onBlur={field.onBlur}
											onChange={(event) => {
												field.onChange(event.target.checked);
											}}
										/>
									)}
								/>
							)}
						</fieldset>
					</div>
					<Disclosure
						className="md:col-start-1 md:self-start"
						defaultOpen={moreOptionsOpen}
						title={t(`${key}.moreOptions`)}
					>
						<Controller
							control={control}
							name="hoursLimitsApply"
							render={({ field }) => (
								<div className="flex flex-col gap-3">
									<div>
										<p
											className="text-sm font-semibold text-neutral-900"
											id={idOf("hoursLimits")}
										>
											{t(`${key}.hoursLimits`)}
										</p>
										<p className="mt-1 text-xs text-neutral-700">
											{t(`${key}.hoursLimitsDescription`)}
										</p>
									</div>
									<div
										aria-labelledby={idOf("hoursLimits")}
										className="flex flex-col gap-3"
										role="radiogroup"
									>
										<RadioCard
											checked={field.value}
											description={t(`${key}.limitsApplyDescription`)}
											disabled={isSubmitting}
											label={t(`${key}.limitsApply`)}
											name={`${formId}-limits`}
											value="APPLY"
											onChange={() => {
												field.onChange(true);
											}}
										/>
										<RadioCard
											checked={!field.value}
											description={t(`${key}.limitsDontApplyDescription`)}
											disabled={isSubmitting}
											label={t(`${key}.limitsDontApply`)}
											name={`${formId}-limits`}
											value="DONT_APPLY"
											onChange={() => {
												field.onChange(false);
											}}
										/>
									</div>
								</div>
							)}
						/>
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
				</div>
			</form>
		</Dialog>
	);
};

/**
 * Adds or edits employment terms: the kind of week (whose figures come from
 * the API's presets), a name suggested from the week until one is typed, the
 * hours, days and rest, overtime, and under More options the Act's hour
 * limits and a description. "These terms in words" reads the form back as
 * it changes. Saving held terms with a different week asks how the change
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
