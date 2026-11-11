import { zodResolver } from "@hookform/resolvers/zod";
import { Fragment, useEffect, useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { RadioCard } from "@/components/forms/RadioCard";
import { Select, type SelectOption } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { SaveIcon, SwapIcon } from "@/components/ui/Icon";
import { UnitNameField } from "@/features/organisation/UnitNameField";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import { ConstraintPreview } from "@/features/scheduling/constraints/ConstraintPreview";
import {
	CONSTRAINT_CATEGORIES,
	CONSTRAINT_COMPARISONS,
	CONSTRAINT_REQUIREMENTS,
	CONSTRAINT_STATUSES,
	POLICY_LOCKS,
	type ConstraintField,
	type ConstraintFieldKind,
	type ConstraintFieldSpec,
	type ConstraintTypeOption,
} from "@/features/scheduling/constraints/api";
import { constraintRefusal } from "@/features/scheduling/constraints/constraintRefusal";
import { fieldRowsInReadingOrder } from "@/features/scheduling/constraints/ConstraintDialog/fieldOrder";
import { nameSuggestion } from "@/features/scheduling/constraints/ConstraintDialog/nameSuggestion";
import { shiftsMissingTitles } from "@/features/scheduling/constraints/ConstraintDialog/shiftsMissingTitles";
import { appliesToOf } from "@/features/scheduling/constraints/appliesTo";
import {
	constraintSchema,
	type ConstraintDialogBody,
	type ConstraintFieldValues,
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
	type PolicyReachChoices,
	type PolicyReachValue,
} from "@/features/scheduling/policy/policyReach";
import { PolicyReachField } from "@/features/scheduling/policy/PolicyReachField";
import type { Constraint } from "@/features/scheduling/scheduleDraft";
import {
	SetupDepartmentField,
	type SetupDepartment,
} from "@/features/scheduling/SetupDepartmentField";
import { WEEKDAYS } from "@/features/scheduling/shifts/api";

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
	reach?: { choices: PolicyReachChoices; initial: PolicyReachValue };
	/** The Department field, shown first: chosen when adding, fixed when editing; left out inside a schedule, whose department is known. */
	department?: SetupDepartment;
	/** What saving the change reaches, said below the last field. */
	impactNote?: string;
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
	"PERIOD_DAYS",
	"REST_HOURS",
] as const satisfies ReadonlyArray<ConstraintField>;

type HintedField = (typeof HINTED_FIELDS)[number];

const isHinted = (field: ConstraintField): field is HintedField =>
	(HINTED_FIELDS as ReadonlyArray<ConstraintField>).includes(field);

/** A row of the form: one of its own fields, or one of the type's. */
type FieldName = keyof ConstraintFormValues | ConstraintField;

/** A constraint's values by field, as the form holds them. */
const valuesByField = (values: Constraint["values"]): ConstraintFieldValues => {
	const byField: ConstraintFieldValues = {};
	for (const { field, value } of values)
		if (value !== null) byField[field] = [...(byField[field] ?? []), value];
	return byField;
};

/**
 * Adds a constraint to the department, or changes one; every draft of the
 * department sees it. The type decides the fields: one row per field the
 * API's spec gives it, a number as a number box in its range, a field of one
 * value as a Select and one of several as a multi-choice Select. Mount when
 * opened and unmount when closed so every attempt starts fresh; Reset
 * returns the form to what it opened with.
 */
export const ConstraintDialog = ({
	editing,
	options,
	replacing,
	withLock = false,
	reach,
	department,
	impactNote,
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
	const form = useForm<ConstraintFormValues, unknown, ConstraintDialogBody>({
		// The fields to check depend on the type chosen, so the schema is built per check.
		resolver: (values, context, resolverOptions) =>
			zodResolver(
				constraintSchema(typeOf(values.type), t, withLock, reach !== undefined)
			)(values, context, resolverOptions),
		defaultValues: {
			name: editing?.name ?? "",
			type: startingPoint?.type ?? "",
			// A new constraint starts as a Must; an edit or replacement keeps its own.
			requirement: startingPoint ? (startingPoint.requirement ?? "") : "MUST",
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
		reset,
		setValue,
		formState: { errors, isSubmitting },
	} = form;
	const [name, type, requirement, values] = useWatch({
		control,
		name: ["name", "type", "requirement", "values"],
	});
	const chosen = typeOf(type);
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
	// Grouped under their category: the Select heads each run of one group.
	const typeOptions: Array<SelectOption> = CONSTRAINT_CATEGORIES.flatMap(
		(category) =>
			(offered?.types ?? [])
				.filter((option) => option.category === category)
				.map((option) => ({
					value: option.type,
					label: t(`scheduling.constraints.types.${option.type}`),
					group: t(`scheduling.constraints.categories.${category}`),
				}))
	);
	// A saved company rule keeps its type (the API answers CONSTRAINT_TYPE_FIXED); a new rule is added instead.
	const typeFixed = withLock && editing !== undefined;
	// Until a Department is chosen there are no types, shifts or job titles to offer.
	const departmentMissing =
		department?.kind === "choose" && department.value === "";
	// Why there is nothing to choose yet, or once a type is chosen, one worked example of it.
	const typeHint = (): string => {
		if (typeFixed) return t(`${key}.typeFixed`);
		if (departmentMissing) return t(`${key}.optionsNeedDepartment`);
		if (options.status === "pending") return t(`${key}.optionsLoading`);
		if (options.status === "hidden") return t(`${key}.optionsHidden`);
		if (options.status === "error") return t(`${key}.optionsFailed`);
		if (chosen) return t(`scheduling.constraints.examples.${chosen.type}`);
		return t(`${key}.typeHintEmpty`);
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
	// What a field of each kind but a number is chosen from.
	const choices: Record<
		Exclude<ConstraintFieldKind, "NUMBER">,
		Array<SelectOption>
	> = {
		COMPARISON: CONSTRAINT_COMPARISONS.map((comparison) => ({
			value: comparison,
			label: t(`scheduling.constraints.comparisons.${comparison}`),
		})),
		WEEKDAY: WEEKDAYS.map((day) => ({
			value: day,
			label: t(`weekdays.${day}`),
		})),
		JOB_TITLE: (offered?.jobTitles ?? []).map((jobTitle) => ({
			value: jobTitle.jobTitleId,
			label: jobTitle.name,
		})),
		SHIFT: (offered?.shifts ?? []).map((shift) => ({
			value: shift.shiftId,
			label: shift.name,
		})),
	};
	const noChoices: Partial<Record<ConstraintFieldKind, string>> = {
		JOB_TITLE: t(`${key}.noJobTitles`),
		SHIFT: t(`${key}.noShifts`),
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
	// Never blocks: a chosen shift that lists none of the counted job titles
	// could never count anyone, which the manager may still mean to fix later.
	const shiftWarning = (option: ConstraintTypeOption): string | undefined => {
		const filled = filledValues(option);
		const ofField = (fields: Array<ConstraintField>): Array<SentenceValue> =>
			filled.filter((value) => fields.includes(value.field));
		const counted = ofField(["JOB_TITLE", "STAND_IN_JOB_TITLE"]);
		const chosenShiftIds = ofField(["SHIFT"]).map((value) => value.value);
		const missing = shiftsMissingTitles(
			(offered?.shifts ?? []).filter((shift) =>
				chosenShiftIds.includes(shift.shiftId)
			),
			counted.map((value) => value.value)
		);
		if (missing.length === 0) return undefined;
		return t(`${key}.shiftMissingTitles`, {
			count: missing.length,
			shifts: t("scheduling.constraints.list", { items: missing }),
			jobTitles: t("scheduling.constraints.listOr", {
				items: counted.map((value) => value.name ?? value.value),
			}),
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
		field: "type" | "status" | "lock",
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
	// Must or If possible as two cards, each saying what happens when unmet; a type that offers no choice says which it always is.
	const firmnessRow = (option: ConstraintTypeOption): FunctionComponent => {
		const id = fieldId("requirement");
		const label = t(`${key}.requirement`);
		const error = errors.requirement?.message;
		if (!option.hasRequirement) {
			const fixed = firmnessOf({ type: option.type, requirement: null });
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
				htmlFor={id}
				label={label}
				layout="stacked"
			>
				<Controller
					control={control}
					name="requirement"
					render={({ field }) => (
						<div
							aria-describedby={describedBy("requirement", error, false)}
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
		return (
			<FormRow
				key={spec.field}
				required
				className={className}
				error={error}
				hint={hint}
				htmlFor={id}
				label={t(`scheduling.constraints.fields.${spec.field}`)}
				layout="stacked"
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
						if (spec.kind === "NUMBER")
							return (
								<Input
									{...shared}
									aria-required="true"
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
						const select = {
							...shared,
							"aria-labelledby": labelledBy(spec.field),
							options: choices[spec.kind],
							placeholder: t(`${key}.pleaseSelect`),
						};
						return spec.maxCount === 1 ? (
							<Select
								{...select}
								value={value[0] ?? ""}
								onChange={(choice) => {
									field.onChange([choice]);
								}}
							/>
						) : (
							<Select
								{...select}
								multiple
								emptyText={noChoices[spec.kind]}
								selectAllLabel={t(`${key}.selectAll`)}
								value={value}
								onChange={field.onChange}
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
			preventClose={isSubmitting}
			footer={
				<div className="grid gap-6 sm:grid-cols-2">
					<Button
						disabled={isSubmitting}
						leadingIcon={<SwapIcon />}
						variant="secondary"
						onClick={() => {
							reset();
						}}
					>
						{t(`${key}.reset`)}
					</Button>
					<Button
						disabled={!name.trim() || offered === undefined}
						form={formId}
						leadingIcon={<SaveIcon />}
						loading={isSubmitting}
						type="submit"
					>
						{t(`${key}.submit`)}
					</Button>
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
				{department && (
					<SetupDepartmentField
						department={
							department.kind === "choose"
								? {
										...department,
										onChange: (departmentId): void => {
											// Shifts and job titles belong to one Department, so a new one starts the values again.
											setValue("values", {});
											department.onChange(departmentId);
										},
									}
								: department
						}
						labels={{
							label: t(`${key}.department`),
							placeholder: t(`${key}.departmentPlaceholder`),
							hint: t(`${key}.departmentHint`),
							empty: t(`${key}.departmentsEmpty`),
						}}
					/>
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
				{selectRow(
					"type",
					typeOptions,
					typeHint(),
					offered === undefined ||
						typeFixed ||
						replacing !== undefined ||
						editing?.overridesConstraintId != null
				)}
				{reach && (
					<Controller
						control={control}
						name="reach"
						render={({ field }) => (
							<PolicyReachField
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
					selectRow(
						"lock",
						lockOptions,
						t(`${key}.lockHints.${lock === "DEFAULT" ? "DEFAULT" : "LOCKED"}`)
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
							}}
						/>
						{fieldRowsInReadingOrder(chosen).map((row) => {
							const warning =
								row[0]?.field === "SHIFT" ? shiftWarning(chosen) : undefined;
							return (
								<Fragment key={row.map((spec) => spec.field).join("-")}>
									{row.length === 1 ? (
										valueRow(row[0]!)
									) : (
										<div className="flex flex-col gap-6 sm:flex-row">
											{row.map((spec) => valueRow(spec, "sm:flex-1"))}
										</div>
									)}
									{warning && <Callout tone="warning">{warning}</Callout>}
								</Fragment>
							);
						})}
						{firmnessRow(chosen)}
						{/* A new constraint is Active; whether to switch one off is asked only when editing. */}
						{editing &&
							selectRow("status", statusOptions, t(`${key}.statusHint`))}
					</>
				)}
				<UnitNameField
					counter={t(`${key}.nameCounter`, { count: name.length })}
					error={errors.name?.message}
					hint={t(`${key}.nameHint`)}
					id={fieldId("name")}
					label={t(`${key}.name`)}
					placeholder={t(`${key}.namePlaceholder`)}
					registration={register("name")}
				/>
				{impactNote && <p className="text-sm text-neutral-700">{impactNote}</p>}
			</form>
		</Dialog>
	);
};
