import { zodResolver } from "@hookform/resolvers/zod";
import { Fragment, useEffect, useId, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { isOneOf } from "@/common/isOneOf";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { RadioCard } from "@/components/forms/RadioCard";
import { Select, type SelectOption } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorText } from "@/components/ui/ErrorText";
import { UnitNameField } from "@/features/organisation/UnitNameField";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import { ChosenConstraintType } from "@/features/scheduling/constraints/ChosenConstraintType";
import { ConstraintPreview } from "@/features/scheduling/constraints/ConstraintPreview";
import {
	type CompanySetKind,
	ConstraintTypeChooser,
} from "@/features/scheduling/constraints/ConstraintTypeChooser";
import {
	CONSTRAINT_COMPARISONS,
	CONSTRAINT_REQUIREMENTS,
	CONSTRAINT_STATUSES,
	POLICY_LOCKS,
	type ConstraintCategory,
	type ConstraintComparison,
	type ConstraintField,
	type ConstraintFieldKind,
	type ConstraintFieldSpec,
	type ConstraintType,
	type ConstraintTypeOption,
} from "@/features/scheduling/constraints/api";
import { constraintRefusal } from "@/features/scheduling/constraints/constraintRefusal";
import {
	CONSTRAINT_TYPE_CATALOGUE,
	startsIfPossible,
} from "@/features/scheduling/constraints/constraintTypeCatalogue";
import {
	fieldRowsInReadingOrder,
	isFieldShown,
} from "@/features/scheduling/constraints/ConstraintDialog/fieldOrder";
import { nameSuggestion } from "@/features/scheduling/constraints/ConstraintDialog/nameSuggestion";
import { typeGroupsOf } from "@/features/scheduling/constraints/ConstraintDialog/typeGroups";
import {
	allowedComparisons,
	allowedLinkIds,
	dayTypeCodesOf,
	linksByKindOf,
	sharesNothing,
	shownValuesOf,
	withoutUnfitComparison,
	withoutUnfitting,
	type RemovedValue,
} from "@/features/scheduling/constraints/ConstraintDialog/fieldChoices";
import { appliesToOf } from "@/features/scheduling/constraints/appliesTo";
import {
	constraintSchema,
	isChosenNumber,
	valuesByField,
	type ConstraintDialogBody,
	type ConstraintFormValues,
} from "@/features/scheduling/constraints/ConstraintDialog/schema";
import {
	allowsReplacement,
	compareStrictness,
} from "@/features/scheduling/constraints/constraintStrictness";
import {
	firmnessOf,
	type SentenceValue,
} from "@/features/scheduling/constraints/constraintSentence";
import type { ConstraintOptionsState } from "@/features/scheduling/constraints/useConstraintOptions";
import {
	reachedUnitsOf,
	type UnitReachChoices,
	type UnitReachValue,
} from "@/features/workspace/unitReach";
import { UnitReachField } from "@/features/workspace/UnitReachField";
import type { Constraint } from "@/features/scheduling/scheduleDraft";
import {
	SetupDepartmentField,
	type SetupDepartment,
} from "@/features/scheduling/departmentSetup/SetupDepartmentField";
import { dayTypeLabel } from "@/features/scheduling/dayTypes";
import { WEEKDAYS } from "@/features/scheduling/shifts/api";
import {
	NAME_LIMITS,
	NAME_MAX_LENGTH,
} from "@/features/organisation/nameSchema";

export type ConstraintDialogProps = {
	/** Set to change one of the department's constraints. */
	editing?: Constraint;
	/** The constraint types with the fields each takes, and the department's shifts and active job titles. */
	options: ConstraintOptionsState;
	/**
	 * The company constraint this one replaces in the department: its type is
	 * kept, its values are the starting point, and a locked one must not be
	 * loosened (ADR-0058).
	 */
	replacing?: Constraint;
	/** Offers the lock, for a constraint of the company's work policy. */
	withLock?: boolean;
	/** Offers Applies to, for a work-policy constraint: what to choose from, and the reach it opens with (ADR-0072). */
	reach?: { choices: UnitReachChoices; initial: UnitReachValue };
	/** The Department field, shown first: chosen when adding, fixed when editing; left out inside a schedule, whose department is known. */
	department?: SetupDepartment;
	/** What saving the change reaches, said below the last field. */
	impactNote?: string;
	/** The category the chooser brings into view first, as when Add is pressed on that section. */
	startAt?: ConstraintCategory;
	/**
	 * Once-only kinds the company already sets in the department, which the
	 * API refuses to add there (CONSTRAINT_TYPE_SET_BY_COMPANY). Choosing one
	 * calls `onChoose` instead, to change the company's rule here.
	 */
	setByCompany?: {
		kinds: ReadonlyArray<CompanySetKind>;
		onChoose: (type: ConstraintType) => void;
	};
	/** Sends the constraint; a rejection is explained on its field or as the alert. */
	onSave: (body: ConstraintDialogBody) => Promise<unknown>;
	onClose: () => void;
};

const FIELDS = ["name", "type"] as const;

/** The fields whose row carries a hint; the others say enough in their label. */
const HINTED_FIELDS = [
	"SHIFT",
	"HEADCOUNT",
	"JOB_TITLE",
	"STAND_INS_PER_PERSON",
	"DAYS_OFF",
	"PERIOD_WEEKS",
	"REST_HOURS",
	"DAYS_IN_A_ROW",
	"DAY_TYPE_COUNT",
	"WORK_HOURS_A_DAY",
	"OVERTIME_HOURS_A_MONTH",
	"CALL_BACKS",
] as const satisfies ReadonlyArray<ConstraintField>;

type HintedField = (typeof HINTED_FIELDS)[number];

/** Numbers a type may leave out, each worded as a choice: what leaving it out means, or a figure. */
const CHOICE_FIELDS = [
	"CALL_BACK_SPAN_DAYS",
] as const satisfies ReadonlyArray<ConstraintField>;

type ChoiceField = (typeof CHOICE_FIELDS)[number];

const isChoiceField = (field: ConstraintField): field is ChoiceField =>
	isOneOf(CHOICE_FIELDS, field);

const isHinted = (field: ConstraintField): field is HintedField =>
	isOneOf(HINTED_FIELDS, field);

/** The whole numbers from `first` to `last`, in order. */
const numbersFrom = (first: number, last: number): Array<number> =>
	Array.from(
		{ length: Math.max(last - first + 1, 0) },
		(_, index) => first + index
	);

/** A row of the form: one of its own fields, or one of the type's. */
type FieldName = keyof ConstraintFormValues | ConstraintField;

/** From a small screen up, the chooser's panel is 880 px wide: three or four cards a row. */
const CHOOSER_WIDTH_CLASSES = "sm:max-w-220";

/** The dialog's two steps: choosing what the constraint decides, then filling it in. */
type DialogStep = "choose" | "fill";

/**
 * Adds a constraint to the department, or changes one; every draft of the
 * department sees it. Adding starts on a chooser of every kind the API
 * offers; the form follows, with the chosen kind kept at its top. Editing
 * opens on the form. The type decides the fields: one row per field the
 * API's spec gives it, a number as a number box in its range, a field of one
 * value as a Select and one of several as a multi-choice Select. Mount when
 * opened and unmount when closed so every attempt starts fresh.
 */
export const ConstraintDialog = ({
	editing,
	options,
	replacing,
	withLock = false,
	reach,
	department,
	impactNote,
	startAt,
	setByCompany,
	onSave,
	onClose,
}: ConstraintDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.constraints.dialog";
	const formId = useId();
	const fieldId = (name: FieldName): string => `${formId}-${name}`;
	const offered = options.status === "ready" ? options.options : undefined;
	const typeOf = (type: string): ConstraintTypeOption | undefined =>
		offered?.types.find((option) => option.type === type);
	// A replacement starts from the company's values, under the company's type.
	const startingPoint = editing ?? replacing;
	// Values the API says no longer fit start out of the form, and are named above the fields.
	const staleNames = (startingPoint?.values ?? [])
		.filter((value) => value.problem)
		.map((value) => value.name ?? value.value);
	const links = linksByKindOf(offered);
	const nameOfLink = (id: string): string =>
		offered?.shifts.find((shift) => shift.shiftId === id)?.name ??
		offered?.jobTitles.find((jobTitle) => jobTitle.jobTitleId === id)?.name ??
		id;
	const [removedValues, setRemovedValues] = useState<Array<RemovedValue>>([]);
	const [step, setStep] = useState<DialogStep>(
		startingPoint ? "fill" : "choose"
	);
	const form = useForm<ConstraintFormValues, unknown, ConstraintDialogBody>({
		// The fields to check depend on the type chosen, so the schema is built per check.
		resolver: (values, context, resolverOptions) =>
			zodResolver(
				constraintSchema(
					typeOf(values.type),
					t,
					withLock,
					reach !== undefined,
					{
						links,
						nameOf: nameOfLink,
					}
				)
			)(values, context, resolverOptions),
		defaultValues: {
			name: editing?.name ?? "",
			type: startingPoint?.type ?? "",
			// A new constraint starts as a Must; an edit or replacement keeps its own.
			// A row saved without a requirement ran as a Must, as the API reads it (ADR-0086).
			requirement: startingPoint?.requirement ?? "MUST",
			status: editing?.status ?? "ACTIVE",
			lock: withLock ? (editing?.lock ?? "LOCKED") : "",
			values: startingPoint ? valuesByField(startingPoint.values) : {},
			...(reach ? { reach: reach.initial } : {}),
		},
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const {
		register,
		control,
		handleSubmit,
		setValue,
		formState: { errors, isSubmitting },
	} = form;
	const [name, type, requirement, values] = useWatch({
		control,
		name: ["name", "type", "requirement", "values"],
	});
	const chosen = typeOf(type);
	// A rule the system adds always applies: only its comparison, number and name change.
	const alwaysApplies = chosen?.addedBySystem === true;
	const { message, alertRef, close, run } = useCreateFormSubmit(
		form,
		FIELDS,
		onClose
	);
	const describedBy = (
		name: FieldName,
		error: string | undefined,
		hint: boolean
	): string | undefined => {
		const ids = formRowIds(fieldId(name));
		if (error) return ids.errorId;
		return hint ? ids.hintId : undefined;
	};
	const labelledBy = (name: FieldName): string =>
		formRowIds(fieldId(name)).labelId;
	// The kinds on offer, grouped and ordered as the API lists them.
	const typeGroups = typeGroupsOf(offered?.types ?? [], startingPoint?.type);
	// A saved company rule keeps its type (the API answers CONSTRAINT_TYPE_FIXED); a new rule is added instead.
	const typeFixed = withLock && editing !== undefined;
	// Until a Department is chosen there are no types, shifts or job titles to offer.
	const departmentMissing =
		department?.kind === "choose" && department.value === "";
	// A replacement, a department's own copy of a company rule, a saved company rule and a rule the system adds keep their kind.
	const typeChangeable =
		!typeFixed &&
		replacing === undefined &&
		editing?.overridesConstraintId == null &&
		!alwaysApplies;
	// Why there is nothing to choose from yet.
	const optionsNote = (): string | undefined => {
		if (departmentMissing) return t(`${key}.optionsNeedDepartment`);
		if (options.status === "pending") return t(`${key}.optionsLoading`);
		if (options.status === "hidden") return t(`${key}.optionsHidden`);
		if (options.status === "error") return t(`${key}.optionsFailed`);
		return undefined;
	};
	const statusOptions: Array<SelectOption> = CONSTRAINT_STATUSES.map(
		(status) => ({
			value: status,
			label: t(`scheduling.constraints.statuses.${status}`),
		})
	);
	const lockOptions: Array<SelectOption> = POLICY_LOCKS.map((lock) => ({
		value: lock,
		label: t(`scheduling.constraints.locks.${lock}`),
	}));
	const [lock] = useWatch({ control, name: ["lock"] });
	// Where a work-policy constraint will apply, so the preview says it before saving.
	const chosenReach = useWatch({ control, name: "reach" });
	// A locked company constraint is a floor: refuse a looser replacement before the API does.
	const tooLoose = (body: ConstraintDialogBody): boolean => {
		const parentType = replacing && typeOf(replacing.type);
		if (!replacing?.locked || !parentType) return false;
		return !allowsReplacement(
			"LOCKED",
			compareStrictness(parentType, replacing, body)
		);
	};
	// The comparisons a field takes, as the API lists them (all three when it lists none), narrowed while a field
	// holds only some of its day types (ADR-0087).
	const comparisonsOf = (
		spec: ConstraintFieldSpec | undefined
	): ReadonlyArray<ConstraintComparison> =>
		spec?.comparisons ?? CONSTRAINT_COMPARISONS;
	const comparisonLabel = (comparison: string): string =>
		t(
			`scheduling.constraints.comparisons.${comparison as ConstraintComparison}`
		);
	const comparisonChoices = (spec: ConstraintFieldSpec): Array<SelectOption> =>
		allowedComparisons(chosen?.fields ?? [], values, comparisonsOf(spec)).map(
			(comparison) => ({
				value: comparison,
				label: comparisonLabel(comparison),
			})
		);
	// What a field of each other kind but a number is chosen from.
	const choices: Record<
		Exclude<ConstraintFieldKind, "NUMBER" | "COMPARISON">,
		Array<SelectOption>
	> = {
		WEEKDAY: WEEKDAYS.map((day) => ({
			value: day,
			label: t(`weekdays.${day}`),
		})),
		JOB_TITLE: (offered?.jobTitles ?? []).map((jobTitle) => ({
			value: jobTitle.jobTitleId,
			label: jobTitle.name,
		})),
		// Each named with its group, whose chip above the list chooses the whole group at once.
		SHIFT: (offered?.shifts ?? []).map((shift) => ({
			value: shift.shiftId,
			label: shift.name,
			group: shift.group ?? undefined,
		})),
		DAY_TYPE: (offered?.dayTypeChoices ?? []).map((code) => ({
			value: code,
			label: dayTypeLabel(code, t, 1, offered?.dayTypeNames[code]),
		})),
	};
	const noChoices: Partial<Record<ConstraintFieldKind, string>> = {
		JOB_TITLE: t(`${key}.noJobTitles`),
		SHIFT: t(`${key}.noShifts`),
	};
	// What a field of each kind says when the values chosen in the field it depends on share none of that kind.
	const noOverlap: Partial<Record<ConstraintFieldKind, string>> = {
		JOB_TITLE: t(`${key}.dependency.noOverlap.JOB_TITLE`),
	};
	// Job titles and shifts read as their names; a plain value never matches an id.
	const namesById = new Map(
		[...choices.JOB_TITLE, ...choices.SHIFT].map(({ value, label }) => [
			value,
			label,
		])
	);
	// The constraint's values as filled in so far, named, for the preview.
	const filledValues = (option: ConstraintTypeOption): Array<SentenceValue> =>
		option.fields.flatMap(({ field }) =>
			(values[field] ?? []).filter(Boolean).map((value) => ({
				field,
				value,
				name: namesById.get(value) ?? null,
			}))
		);
	const fieldLabel = (field: ConstraintField): string =>
		t(`scheduling.constraints.fields.${field}`);
	// A field that depends on another offers only what fits what is chosen there (ADR-0085).
	const offeredChoices = (spec: ConstraintFieldSpec): Array<SelectOption> => {
		if (spec.kind === "COMPARISON") return comparisonChoices(spec);
		// A number is typed, except one chosen from its range, each worded: "Every 2 weeks".
		if (spec.kind === "NUMBER")
			return isChosenNumber(spec.field)
				? numbersFrom(spec.min ?? 1, spec.max ?? 1).map((count) => ({
						value: String(count),
						label: t("scheduling.constraints.periodWeeks", { count }),
					}))
				: [];
		// A day-type field offers its own codes, named as the company stores them when there is no translation.
		if (spec.kind === "DAY_TYPE")
			return dayTypeCodesOf(spec, offered?.dayTypeChoices ?? []).map(
				(code) => ({
					value: code,
					label: dayTypeLabel(code, t, 1, offered?.dayTypeNames[code]),
				})
			);
		const all = choices[spec.kind];
		if (!spec.listedBy && !spec.excludes) return all;
		const allowed = allowedLinkIds(spec, chosen?.fields ?? [], values, links);
		return all.filter((choice) => allowed.includes(choice.value));
	};
	// Why a dependent field offers nothing: nothing chosen in the field it depends on, what is chosen there shares
	// nothing of its kind, or nothing there lists one.
	const emptyTextOf = (spec: ConstraintFieldSpec): string | undefined => {
		if (!spec.listedBy) return noChoices[spec.kind];
		const shareNone = noOverlap[spec.kind];
		if (shareNone && sharesNothing(spec, chosen?.fields ?? [], values, links))
			return shareNone;
		const parent = spec.listedBy;
		return t(
			(values[parent] ?? []).length === 0
				? `${key}.dependency.chooseFirst`
				: `${key}.dependency.noneListed`,
			{ field: fieldLabel(parent) }
		);
	};
	// A new choice in one field takes out what no longer fits in the others, and says so under them.
	const chooseValues = (
		field: ConstraintField,
		chosenValues: Array<string>
	): void => {
		const fields = chosen?.fields ?? [];
		const fitting = withoutUnfitting(
			fields,
			{ ...values, [field]: chosenValues },
			links
		);
		const next = withoutUnfitComparison(
			fields,
			fitting.values,
			comparisonsOf(fields.find((spec) => spec.kind === "COMPARISON"))
		);
		setValue("values", next.values, {
			shouldValidate: form.formState.isSubmitted,
		});
		setRemovedValues([...fitting.removed, ...next.removed]);
	};
	// The line under a field naming what a change took out of it, and why.
	const removedNote = (spec: ConstraintFieldSpec): string | undefined => {
		const removed = removedValues.filter((item) => item.field === spec.field);
		const [first] = removed;
		if (!first) return undefined;
		const because = {
			NOT_LISTED: spec.listedBy,
			EXCLUDED: spec.excludes,
			PARTIAL: chosen?.fields.find(
				(other) => other.partialComparisons.length > 0
			)?.field,
		}[first.reason];
		return t(`${key}.dependency.removed.${first.reason}`, {
			count: removed.length,
			names: t("scheduling.constraints.list", {
				items: removed.map((item) =>
					item.reason === "PARTIAL"
						? comparisonLabel(item.value)
						: nameOfLink(item.value)
				),
			}),
			field: because ? fieldLabel(because) : "",
		});
	};
	// A new constraint's name fills itself in from what it controls and its
	// first shift, until the manager types one; an edit or a replacement keeps
	// the name it has.
	const suggestsName = editing === undefined && replacing === undefined;
	const firstShiftId = values.SHIFT?.[0];
	const suggestedName = chosen
		? nameSuggestion(
				chosen.type,
				firstShiftId === undefined ? undefined : namesById.get(firstShiftId),
				t
			)
		: "";
	const nameTyped = form.getFieldState("name", form.formState).isDirty;
	useEffect(() => {
		if (suggestsName && !nameTyped) setValue("name", suggestedName);
	}, [suggestsName, nameTyped, suggestedName, setValue]);
	const selectRow = (
		field: "status" | "lock",
		choiceOptions: Array<SelectOption>,
		hint: string,
		disabled = false
	): FunctionComponent => (
		<FormRow
			required
			className="sm:flex-1"
			error={errors[field]?.message}
			hint={hint}
			htmlFor={fieldId(field)}
			label={t(`${key}.${field}`)}
			layout="stacked"
		>
			<Controller
				control={control}
				name={field}
				render={({ field: control }) => (
					<Select
						ref={control.ref}
						aria-describedby={describedBy(field, errors[field]?.message, true)}
						aria-labelledby={labelledBy(field)}
						className="w-full"
						disabled={disabled}
						name={control.name}
						options={choiceOptions}
						placeholder={t(`${key}.pleaseSelect`)}
						status={errors[field] ? "error" : undefined}
						value={control.value}
						onChange={control.onChange}
					/>
				)}
			/>
		</FormRow>
	);
	// What If possible lets a rule of each group do, said under the two cards: a working-hours figure may be passed.
	const firmnessHints: Partial<Record<ConstraintCategory, string>> = {
		WORKING_HOURS: t(`${key}.firmnessHints.WORKING_HOURS`),
	};
	// A type for which Must is a poor fit for some people says so while Must is chosen.
	const firmnessHintOf = (option: ConstraintTypeOption): string | undefined => {
		const mustHintKey = CONSTRAINT_TYPE_CATALOGUE[option.type].mustHintKey;
		return mustHintKey && requirement === "MUST"
			? t(mustHintKey)
			: firmnessHints[option.category];
	};
	// Must or If possible as two cards, each saying what happens when unmet; a type that offers no choice says which it always is.
	const firmnessRow = (option: ConstraintTypeOption): FunctionComponent => {
		const id = fieldId("requirement");
		const label = t(`${key}.requirement`);
		const error = errors.requirement?.message;
		const hint = firmnessHintOf(option);
		const hinted = hint !== undefined;
		if (!option.hasRequirement) {
			const fixed = firmnessOf({
				requirement: null,
				requirementPolicy: option.requirementPolicy,
			});
			return (
				fixed && (
					<FormRow htmlFor={id} label={label} layout="stacked">
						<p className="text-sm text-neutral-800" id={id}>
							{t(`scheduling.constraints.fixedFirmness.${fixed}`)}
						</p>
					</FormRow>
				)
			);
		}
		return (
			<FormRow
				required
				error={error}
				hint={hint}
				htmlFor={id}
				label={label}
				layout="stacked"
			>
				<Controller
					control={control}
					name="requirement"
					render={({ field }) => (
						<div
							aria-describedby={describedBy("requirement", error, hinted)}
							aria-labelledby={labelledBy("requirement")}
							className="grid gap-4 sm:grid-cols-2"
							id={id}
							role="radiogroup"
						>
							{CONSTRAINT_REQUIREMENTS.map((choice) => (
								<RadioCard
									key={choice}
									checked={field.value === choice}
									description={t(`scheduling.constraints.firmness.${choice}`)}
									disabled={isSubmitting}
									label={t(`scheduling.constraints.requirements.${choice}`)}
									name={`${formId}-requirement`}
									value={choice}
									onChange={field.onChange}
								/>
							))}
						</div>
					)}
				/>
			</FormRow>
		);
	};
	const valueRow = (
		spec: ConstraintFieldSpec,
		className?: string
	): FunctionComponent => {
		const id = fieldId(spec.field);
		const error = errors.values?.[spec.field]?.message;
		const hint = isHinted(spec.field)
			? t(`scheduling.constraints.fieldHints.${spec.field}`, {
					min: spec.min,
					max: spec.max,
				})
			: undefined;
		// A number the type may leave out is a choice: its "left out" meaning, or a figure.
		const choiceField = isChoiceField(spec.field) ? spec.field : undefined;
		const optional = choiceField !== undefined && spec.minCount === 0;
		return (
			<FormRow
				key={spec.field}
				className={className}
				error={error}
				hint={hint}
				htmlFor={id}
				label={t(`scheduling.constraints.fields.${spec.field}`)}
				layout="stacked"
				required={!optional}
			>
				<Controller
					control={control}
					name={`values.${spec.field}`}
					render={({ field }) => {
						const value = field.value ?? [];
						const shared = {
							ref: field.ref,
							"aria-describedby": describedBy(
								spec.field,
								error,
								hint !== undefined
							),
							className: "w-full",
							name: field.name,
							status: error ? ("error" as const) : undefined,
						};
						const numberInput = (
							<Input
								{...shared}
								aria-required={optional ? undefined : "true"}
								id={id}
								inputMode="numeric"
								max={spec.max ?? undefined}
								min={spec.min ?? undefined}
								type="number"
								value={value[0] ?? ""}
								onChange={(event) => {
									field.onChange([event.target.value]);
								}}
							/>
						);
						if (choiceField !== undefined && optional)
							return (
								<div className="grid gap-3">
									<div className="grid gap-4 sm:grid-cols-2" role="radiogroup">
										<RadioCard
											checked={value.length === 0}
											disabled={isSubmitting}
											name={`${formId}-${spec.field}-choice`}
											value="unset"
											label={t(
												`scheduling.constraints.optionalNumbers.${choiceField}.unset`
											)}
											onChange={() => {
												field.onChange([]);
											}}
										/>
										<RadioCard
											checked={value.length > 0}
											disabled={isSubmitting}
											name={`${formId}-${spec.field}-choice`}
											value="set"
											label={t(
												`scheduling.constraints.optionalNumbers.${choiceField}.set`
											)}
											onChange={() => {
												field.onChange([value[0] ?? ""]);
											}}
										/>
									</div>
									{value.length > 0 && numberInput}
								</div>
							);
						if (spec.kind === "NUMBER" && !isChosenNumber(spec.field))
							return numberInput;
						const select = {
							...shared,
							"aria-labelledby": labelledBy(spec.field),
							options: offeredChoices(spec),
							placeholder: t(`${key}.pleaseSelect`),
							// A department's replacement keeps the company's day type; the company chooses it (ADR-0087).
							disabled: replacing !== undefined && spec.kind === "DAY_TYPE",
						};
						return spec.maxCount === 1 ? (
							<Select
								{...select}
								value={value[0] ?? ""}
								onChange={(choice) => {
									chooseValues(spec.field, [choice]);
								}}
							/>
						) : (
							<Select
								{...select}
								multiple
								emptyText={emptyTextOf(spec)}
								groupCountText={(count) => t(`${key}.shiftCount`, { count })}
								groupsLabel={t(`${key}.shiftGroups`)}
								selectAllLabel={t(`${key}.selectAll`)}
								value={shownValuesOf(spec, value)}
								wholeGroups={spec.kind === "SHIFT"}
								onChange={(chosenValues) => {
									chooseValues(spec.field, chosenValues);
								}}
							/>
						);
					}}
				/>
			</FormRow>
		);
	};

	return (
		<Dialog
			open
			// The chooser shows every kind in full, so it takes the wide panel; the form returns to the usual width.
			className={step === "choose" ? CHOOSER_WIDTH_CLASSES : undefined}
			preventClose={isSubmitting}
			description={[
				department?.kind === "fixed" ? department.label : undefined,
				startingPoint
					? undefined
					: t(step === "choose" ? `${key}.stepChoose` : `${key}.stepFill`),
			]
				.filter(Boolean)
				.join(" · ")}
			footer={
				<div className="grid grid-cols-2 gap-4">
					<Button disabled={isSubmitting} variant="cancel" onClick={close}>
						{t(`${key}.cancel`)}
					</Button>
					{/* Keyed apart, so the click on Continue never lands on the submit button that replaces it. */}
					{step === "choose" ? (
						<Button
							key="continue"
							disabled={chosen === undefined}
							onClick={() => {
								setStep("fill");
							}}
						>
							{t(`${key}.continue`)}
						</Button>
					) : (
						<Button
							key="submit"
							disabled={!name.trim() || offered === undefined}
							form={formId}
							loading={isSubmitting}
							type="submit"
						>
							{t(startingPoint ? `${key}.submit` : `${key}.add`)}
						</Button>
					)}
				</div>
			}
			title={t(
				replacing
					? `${key}.replaceTitle`
					: editing
						? `${key}.editTitle`
						: `${key}.title`
			)}
			onClose={close}
		>
			<form
				noValidate
				aria-busy={isSubmitting}
				className="space-y-6"
				id={formId}
				onSubmit={(event) =>
					handleSubmit(async (body) => {
						// Refused here as the API would, through the same path, so the alert
						// replaces an earlier refusal and takes focus.
						const looser = tooLoose(body);
						const sent = replacing
							? { ...body, overridesConstraintId: replacing.constraintId }
							: editing?.overridesConstraintId
								? {
										...body,
										overridesConstraintId: editing.overridesConstraintId,
									}
								: body;
						await run(
							async () => {
								if (looser) throw new Error("Looser than the company's");
								await onSave(sent);
							},
							(error) =>
								looser
									? {
											fields: {},
											message: t(`${key}.notStricter`),
											refreshMembers: false,
										}
									: constraintRefusal(
											error,
											{
												name: body.name,
												editing: editing !== undefined,
												company: withLock,
											},
											t
										)
						);
					})(event)
				}
			>
				{message && (
					<p
						ref={alertRef}
						className="text-sm text-error-700"
						role="alert"
						tabIndex={-1}
					>
						{message}
					</p>
				)}
				{department?.kind === "choose" && (
					<SetupDepartmentField
						department={{
							...department,
							onChange: (departmentId): void => {
								// Shifts and job titles belong to one Department, so a new one starts the values again.
								setValue("values", {});
								setRemovedValues([]);
								department.onChange(departmentId);
							},
						}}
						labels={{
							label: t(`${key}.department`),
							placeholder: t(`${key}.departmentPlaceholder`),
							hint: t(`${key}.departmentHint`),
							empty: t(`${key}.departmentsEmpty`),
						}}
					/>
				)}
				{optionsNote() !== undefined && (
					<p className="text-sm text-neutral-700">{optionsNote()}</p>
				)}
				{step === "choose" && (
					<ConstraintTypeChooser
						disabled={isSubmitting}
						groups={typeGroups}
						setByCompany={setByCompany?.kinds}
						startAt={startAt}
						value={type}
						onChange={(chosenType: ConstraintType) => {
							if (
								setByCompany?.kinds.some((kind) => kind.type === chosenType)
							) {
								setByCompany.onChoose(chosenType);
								return;
							}
							setValue("type", chosenType);
							// A new rule of a kind that was only ever If possible still starts If possible.
							if (!startingPoint)
								setValue(
									"requirement",
									startsIfPossible(chosenType) ? "SHOULD" : "MUST"
								);
						}}
					/>
				)}
				{step === "fill" && (
					<>
						{chosen && (
							<ChosenConstraintType
								disabled={isSubmitting}
								note={typeFixed ? t(`${key}.typeFixed`) : undefined}
								type={chosen.type}
								onChange={
									typeChangeable
										? (): void => {
												setStep("choose");
											}
										: undefined
								}
							/>
						)}
						{errors.type?.message && (
							<ErrorText>{errors.type.message}</ErrorText>
						)}
						{staleNames.length > 0 && (
							<Callout tone="warning">
								{t(`${key}.dependency.staleTakenOut`, {
									items: t("scheduling.constraints.list", {
										items: staleNames,
									}),
								})}
							</Callout>
						)}
						{replacing && (
							<Callout>
								{t(
									replacing.locked
										? `${key}.replacingLocked`
										: `${key}.replacingDefault`,
									{ name: replacing.name }
								)}
							</Callout>
						)}
						{reach && !alwaysApplies && (
							<Controller
								control={control}
								name="reach"
								render={({ field }) => (
									<UnitReachField
										choices={reach.choices}
										disabled={isSubmitting}
										idPrefix={fieldId("reach")}
										value={field.value ?? reach.initial}
										error={
											errors.reach?.branchIds?.message ??
											errors.reach?.departmentIds?.message
										}
										onChange={field.onChange}
									/>
								)}
							/>
						)}
						{withLock &&
							!alwaysApplies &&
							selectRow(
								"lock",
								lockOptions,
								t(
									`${key}.lockHints.${lock === "DEFAULT" ? "DEFAULT" : "LOCKED"}`
								)
							)}
						{chosen && (
							<>
								<ConstraintPreview
									appliesTo={appliesToOf(
										{
											type: chosen.type,
											level: withLock ? "COMPANY" : "DEPARTMENT",
											values: filledValues(chosen),
											...(reach && chosenReach
												? reachedUnitsOf(chosenReach, reach.choices)
												: {}),
										},
										t
									)}
									constraint={{
										type: chosen.type,
										requirement: chosen.hasRequirement
											? (CONSTRAINT_REQUIREMENTS.find(
													(choice) => choice === requirement
												) ?? null)
											: null,
										values: filledValues(chosen),
										fullTimersOnly: chosen.fullTimersOnly,
										requirementPolicy: chosen.requirementPolicy,
									}}
								/>
								{fieldRowsInReadingOrder(chosen)
									// A banned pattern's later days appear as the day before is filled.
									.filter((row) =>
										row.every((spec) => isFieldShown(spec.field, values))
									)
									.map((row) => {
										const notes = row.flatMap(
											(spec) => removedNote(spec) ?? []
										);
										return (
											<Fragment key={row.map((spec) => spec.field).join("-")}>
												{row.length === 1 ? (
													valueRow(row[0]!)
												) : (
													<div className="flex flex-col gap-6 sm:flex-row">
														{row.map((spec) => valueRow(spec, "sm:flex-1"))}
													</div>
												)}
												{notes.map((note) => (
													<p
														key={note}
														className="text-sm text-neutral-700"
														role="status"
													>
														{note}
													</p>
												))}
											</Fragment>
										);
									})}
								{firmnessRow(chosen)}
								{/* A new constraint is Active; whether to switch one off is asked only when editing. */}
								{editing &&
									!alwaysApplies &&
									selectRow("status", statusOptions, t(`${key}.statusHint`))}
							</>
						)}
						<UnitNameField
							error={errors.name?.message}
							hint={t(`${key}.nameHint`, NAME_LIMITS)}
							id={fieldId("name")}
							label={t(`${key}.name`)}
							placeholder={t(`${key}.namePlaceholder`)}
							registration={register("name")}
							counter={t(`${key}.nameCounter`, {
								count: name.length,
								max: NAME_MAX_LENGTH,
							})}
						/>
						{impactNote && (
							<p className="text-sm text-neutral-700">{impactNote}</p>
						)}
					</>
				)}
			</form>
		</Dialog>
	);
};
