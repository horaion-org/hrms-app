import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useId, useMemo, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { WEEKDAYS } from "@/common/weekdays";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { RadioCard } from "@/components/forms/RadioCard";
import { Select } from "@/components/forms/Select";
import { Textarea } from "@/components/forms/Textarea";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import {
	termsPresetsQuery,
	type ApplyChange,
	type EmploymentTermsBody,
	type TermsOverviewItem,
	type TermsPreset,
} from "@/features/employmentTerms/api";
import { ApplyChangeStep } from "@/features/employmentTerms/ApplyChangeStep";
import { formatDays, formatHours } from "@/features/employmentTerms/hours";
import {
	applyChangeRefusal,
	isHeldRefusal,
	termsSaveRefusal,
} from "@/features/employmentTerms/refusals";
import { suggestedTermsName } from "@/features/employmentTerms/summary";
import {
	needsApplyChoice,
	weekChanges,
} from "@/features/employmentTerms/termsChanges";
import {
	TERMS_DESCRIPTION_MAX_LENGTH,
	TERMS_NAME_MAX_LENGTH,
	termsBodyOf,
	termsFormSchema,
	termsFormValuesOf,
	weekFieldsOf,
	type TermsFormValues,
} from "@/features/employmentTerms/termsForm";
import { TermsSummary } from "@/features/employmentTerms/TermsSummary";
import { useEmploymentTermsActions } from "@/features/employmentTerms/useEmploymentTermsActions";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
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
	/** Set to edit terms; without it, new terms are added from a preset or blank. */
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
const BLANK = "blank";
const key = "employmentTerms.dialog";

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
	// The country's figures (part-time line, longest normal day) and the weeks to start from.
	const presets = useQuery(termsPresetsQuery(companyId));
	const partTimeBelowMinutes = presets.data?.partTimeBelowMinutes ?? null;
	const maxDayMinutes = presets.data?.maxNormalDayMinutes ?? null;
	const [startFrom, setStartFrom] = useState(BLANK);
	// The name follows the week until someone types one; existing terms keep theirs.
	const [nameTyped, setNameTyped] = useState(
		editing !== undefined || initial !== undefined
	);
	const schema = useMemo(
		() => termsFormSchema(t, { maxDayMinutes, language }),
		[t, maxDayMinutes, language]
	);
	const form = useForm<TermsFormValues>({
		resolver: zodResolver(schema),
		defaultValues: termsFormValuesOf(initial ?? editing),
		mode: "onSubmit",
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
	const submit = useCreateFormSubmit(form, FIELDS, onClose);
	const held = (editing?.holderCount ?? 0) + (editing?.scheduledCount ?? 0);
	const choosePreset = (choice: string): void => {
		setStartFrom(choice);
		const preset = presets.data?.presets.find((each) => each.key === choice);
		reset(termsFormValuesOf(preset));
		setNameTyped(false);
		if (preset)
			setValue(
				"name",
				suggestedTermsName(preset, partTimeBelowMinutes, t, language)
			);
	};
	const followWeek = (next: Partial<TermsFormValues>): void => {
		if (nameTyped) return;
		const week = weekFieldsOf({ ...values, ...next });
		if (week)
			setValue(
				"name",
				suggestedTermsName(week, partTimeBelowMinutes, t, language)
			);
	};
	const hoursField = (
		name: "daysPerWeek" | "dayHours" | "weekHours",
		label: string,
		hint?: string
	): ReactNode => {
		const error = errors[name]?.message;
		const ids = formRowIds(idOf(name));
		const registration = register(name, {
			onChange: (event: { target: { value: string } }) => {
				followWeek({ [name]: event.target.value });
			},
		});
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
					className="w-full"
					disabled={isSubmitting}
					id={idOf(name)}
					inputMode="decimal"
					status={error ? "error" : undefined}
					{...registration}
				/>
			</FormRow>
		);
	};
	const weekHint = ((): string | undefined => {
		if (!fields || fields.daysPerWeek === null || fields.dayMinutes === null)
			return undefined;
		const days = formatDays(fields.daysPerWeek, language);
		const day = formatHours(fields.dayMinutes, language);
		const product = Math.round(fields.daysPerWeek * fields.dayMinutes);
		return Math.abs(product - fields.weekMinutes) <= 1
			? t(`${key}.weekFromDays`, { days, day })
			: t(`${key}.weekDiffers`, { days, day });
	})();
	const nameError = errors.name?.message;
	const descriptionError = errors.description?.message;
	const restError = errors.restWeekday?.message;
	const presetChoices: Array<TermsPreset | undefined> = [
		...(presets.data?.presets ?? []),
		undefined,
	];
	return (
		<CreateFormDialog
			alertRef={submit.alertRef}
			cancelLabel={t(`${key}.cancel`)}
			formId={formId}
			submitLabel={t(editing ? `${key}.save` : `${key}.add`)}
			submitting={isSubmitting}
			title={t(editing ? `${key}.editTitle` : `${key}.addTitle`)}
			description={
				editing
					? t(`${key}.editDescription`, { name: editing.name })
					: t(`${key}.addDescription`)
			}
			message={
				submit.message ??
				(unchangedWeek ? t(`${key}.weekUnchanged`) : undefined)
			}
			onClose={submit.close}
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
					await submit.run(
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
			{held > 0 && <Callout>{t(`${key}.held`, { count: held })}</Callout>}
			{!editing && (
				<fieldset className="flex flex-col gap-2">
					<legend className="mb-2 text-sm text-neutral-800">
						{t(`${key}.startFrom`)}
					</legend>
					{presets.isError && (
						<p className="text-xs text-neutral-700">
							{t(`${key}.presetsFailed`)}
						</p>
					)}
					<div className="grid gap-3 sm:grid-cols-2">
						{presetChoices.map((preset) => (
							<RadioCard
								key={preset?.key ?? BLANK}
								checked={startFrom === (preset?.key ?? BLANK)}
								description={preset ? undefined : t(`${key}.blankDescription`)}
								disabled={isSubmitting}
								label={preset?.name ?? t(`${key}.blank`)}
								name={`${formId}-start`}
								value={preset?.key ?? BLANK}
								onChange={choosePreset}
							/>
						))}
					</div>
				</fieldset>
			)}
			<fieldset className="flex flex-col gap-4">
				<legend className="mb-2 text-sm font-semibold text-neutral-900">
					{t(`${key}.workingWeek`)}
				</legend>
				<div className="grid gap-4 sm:grid-cols-3">
					{hoursField("daysPerWeek", t(`${key}.daysPerWeek`))}
					{hoursField("dayHours", t(`${key}.dayHours`))}
					{hoursField("weekHours", t(`${key}.weekHours`), weekHint)}
				</div>
				<p className="text-xs text-neutral-700">{t(`${key}.daysHint`)}</p>
			</fieldset>
			<Controller
				control={control}
				name="restKind"
				render={({ field }) => (
					<fieldset className="flex flex-col gap-3">
						<legend className="mb-2 text-sm font-semibold text-neutral-900">
							{t(`${key}.restDay`)}
						</legend>
						<div
							aria-label={t(`${key}.restDay`)}
							className="grid gap-3 sm:grid-cols-2"
							role="radiogroup"
						>
							<RadioCard
								checked={field.value === "FIXED"}
								description={t(`${key}.restFixedDescription`)}
								disabled={isSubmitting}
								label={t(`${key}.restFixed`)}
								name={`${formId}-rest`}
								value="FIXED"
								onChange={() => {
									field.onChange("FIXED");
									followWeek({ restKind: "FIXED" });
								}}
							/>
							<RadioCard
								checked={field.value === "ROSTERED"}
								description={t(`${key}.restRosteredDescription`)}
								disabled={isSubmitting}
								label={t(`${key}.restRostered`)}
								name={`${formId}-rest`}
								value="ROSTERED"
								onChange={() => {
									field.onChange("ROSTERED");
									followWeek({ restKind: "ROSTERED" });
								}}
							/>
						</div>
						{field.value === "FIXED" && (
							<FormRow
								error={restError}
								htmlFor={idOf("restWeekday")}
								label={t(`${key}.restWeekday`)}
								layout="stacked"
							>
								<Controller
									control={control}
									name="restWeekday"
									render={({ field: weekday }) => (
										<Select
											ref={weekday.ref}
											aria-invalid={Boolean(restError)}
											aria-labelledby={formRowIds(idOf("restWeekday")).labelId}
											className="w-full sm:w-60"
											disabled={isSubmitting}
											name={weekday.name}
											status={restError ? "error" : undefined}
											value={weekday.value}
											options={WEEKDAYS.map((day) => ({
												value: day,
												label: t(`weekdays.${day}`),
											}))}
											onChange={weekday.onChange}
										/>
									)}
								/>
							</FormRow>
						)}
					</fieldset>
				)}
			/>
			<fieldset className="flex flex-col gap-3">
				<legend className="mb-2 text-sm font-semibold text-neutral-900">
					{t(`${key}.overtime`)}
				</legend>
				<p className="text-sm text-neutral-800">
					{t(`${key}.overtimeAfterWeek`)}
				</p>
				<Controller
					control={control}
					name="dailyOvertime"
					render={({ field }) => (
						<Checkbox
							checked={field.value && !values.shiftWork}
							description={t(`${key}.dailyOvertimeDescription`)}
							disabled={isSubmitting || values.shiftWork}
							label={t(`${key}.dailyOvertime`)}
							name={field.name}
							onBlur={field.onBlur}
							onChange={(event) => {
								field.onChange(event.target.checked);
							}}
						/>
					)}
				/>
				<Controller
					control={control}
					name="shiftWork"
					render={({ field }) => (
						<Checkbox
							checked={field.value}
							description={t(`${key}.shiftWorkDescription`)}
							disabled={isSubmitting}
							label={t(`${key}.shiftWork`)}
							name={field.name}
							onBlur={field.onBlur}
							onChange={(event) => {
								field.onChange(event.target.checked);
								followWeek({ shiftWork: event.target.checked });
							}}
						/>
					)}
				/>
			</fieldset>
			<fieldset className="flex flex-col gap-3">
				<legend className="mb-2 text-sm font-semibold text-neutral-900">
					{t(`${key}.hourLimits`)}
				</legend>
				<Controller
					control={control}
					name="hoursLimitsApply"
					render={({ field }) => (
						<Checkbox
							checked={field.value}
							description={t(`${key}.hoursLimitsDescription`)}
							disabled={isSubmitting}
							label={t(`${key}.hoursLimitsApply`)}
							name={field.name}
							onBlur={field.onBlur}
							onChange={(event) => {
								field.onChange(event.target.checked);
							}}
						/>
					)}
				/>
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
			<TermsSummary fields={fields} reference={presets.data} />
		</CreateFormDialog>
	);
};

/**
 * Adds or edits employment terms: where to start from (a common week the
 * API offers, or blank), the working week, the rest day, how overtime
 * counts and whether the Act's hour limits apply, then a name, suggested
 * from the week until one is typed. A plain-language summary reads the
 * terms back as they change. Saving held terms with a different week asks
 * how the change applies (`ApplyChangeStep`). Mount when opened.
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
