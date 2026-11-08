import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Select, type SelectOption } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { SaveIcon, SwapIcon } from "@/components/ui/Icon";
import { UnitNameField } from "@/features/organisation/UnitNameField";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import { ConstraintPreview } from "@/features/scheduling/constraints/ConstraintPreview";
import {
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
	constraintWords,
	sentenceSlotsOf,
	type ConstraintWords,
} from "@/features/scheduling/constraints/constraintSentence";
import type { ConstraintOptionsState } from "@/features/scheduling/constraints/useConstraintOptions";
import type { Constraint } from "@/features/scheduling/scheduleDraft";
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
	/** Offers the lock, for a constraint of the company's Scheduling policy. */
	withLock?: boolean;
	/** Sends the constraint; a rejection is explained on its field or as the alert. */
	onSave: (body: ConstraintDialogBody) => Promise<unknown>;
	onClose: () => void;
};

const FIELDS = ["name", "type"] as const;

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
			zodResolver(constraintSchema(typeOf(values.type), t, withLock))(
				values,
				context,
				resolverOptions
			),
		defaultValues: {
			name: editing?.name ?? "",
			type: startingPoint?.type ?? "",
			requirement: startingPoint?.requirement ?? "",
			status: editing?.status ?? "ACTIVE",
			lock: withLock ? (editing?.lock ?? "LOCKED") : "",
			values: startingPoint ? valuesByField(startingPoint.values) : {},
		},
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const {
		register,
		control,
		handleSubmit,
		reset,
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
	const typeOptions: Array<SelectOption> = (offered?.types ?? []).map(
		(option) => ({
			value: option.type,
			label: t(`${key}.typeOption`, {
				category: t(`scheduling.constraints.categories.${option.category}`),
				type: t(`scheduling.constraints.types.${option.type}`),
			}),
		})
	);
	// A saved company rule keeps its type (the API answers CONSTRAINT_TYPE_FIXED); a new rule is added instead.
	const typeFixed = withLock && editing !== undefined;
	const typeHint = typeFixed
		? t(`${key}.typeFixed`)
		: options.status === "pending"
			? t(`${key}.optionsLoading`)
			: options.status === "hidden"
				? t(`${key}.optionsHidden`)
				: options.status === "error"
					? t(`${key}.optionsFailed`)
					: t(`${key}.typeHint`);
	const requirementOptions: Array<SelectOption> = CONSTRAINT_REQUIREMENTS.map(
		(requirement) => ({
			value: requirement,
			label: t(`scheduling.constraints.requirements.${requirement}`),
		})
	);
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
	// The constraint as filled in so far, in words, for the preview.
	const wordsOf = (option: ConstraintTypeOption): ConstraintWords =>
		constraintWords(
			{
				requirement: option.hasRequirement
					? (CONSTRAINT_REQUIREMENTS.find((item) => item === requirement) ??
						null)
					: null,
				values: option.fields.flatMap(({ field }) =>
					(values[field] ?? []).filter(Boolean).map((value) => ({
						field,
						value,
						name: namesById.get(value) ?? null,
					}))
				),
			},
			t
		);
	const selectRow = (
		field: "type" | "requirement" | "status" | "lock",
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
	const valueRow = (spec: ConstraintFieldSpec): FunctionComponent => {
		const id = fieldId(spec.field);
		const error = errors.values?.[spec.field]?.message;
		const hint =
			spec.kind === "NUMBER"
				? t(`${key}.numberHint`, { min: spec.min, max: spec.max })
				: undefined;
		return (
			<FormRow
				key={spec.field}
				required
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
									placeholder={t(`${key}.enterNumber`)}
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
				<UnitNameField
					autoFocus
					counter={t(`${key}.nameCounter`, { count: name.length })}
					error={errors.name?.message}
					hint={t(`${key}.nameHint`)}
					id={fieldId("name")}
					label={t(`${key}.name`)}
					placeholder={t(`${key}.namePlaceholder`)}
					registration={register("name")}
				/>
				{selectRow(
					"type",
					typeOptions,
					typeHint,
					offered === undefined ||
						typeFixed ||
						replacing !== undefined ||
						editing?.overridesConstraintId != null
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
							slots={sentenceSlotsOf(chosen)}
							type={chosen.type}
							words={wordsOf(chosen)}
						/>
						<div className="flex flex-col gap-6 sm:flex-row">
							{chosen.hasRequirement &&
								selectRow(
									"requirement",
									requirementOptions,
									t(`${key}.requirementHint`)
								)}
							{selectRow("status", statusOptions, t(`${key}.statusHint`))}
						</div>
						{chosen.fields.map(valueRow)}
					</>
				)}
			</form>
		</Dialog>
	);
};
