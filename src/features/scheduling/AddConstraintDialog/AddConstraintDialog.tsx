import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Select, type SelectOption } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
	constraintRuleSchema,
	HEADCOUNT_MAX,
	HEADCOUNT_MIN,
	type ConstraintRuleValues,
} from "@/features/scheduling/constraintRuleSchema";
import { RulePreview } from "@/features/scheduling/RulePreview";
import {
	CONSTRAINT_TYPES,
	RULE_CONDITIONS,
	RULE_REQUIREMENTS,
	type ConstraintRule,
	type ShiftRole,
	type Shift,
} from "@/features/scheduling/scheduleDraft";

export type AddConstraintDialogProps = {
	/** The job roles a rule can name. */
	roles: Array<Pick<ShiftRole, "jobTitleId" | "name">>;
	/** The shifts a rule can name. */
	shifts: Array<Pick<Shift, "shiftId" | "name">>;
	/** The finished rule and the same rule in words. */
	onSubmit: (rule: ConstraintRule, details: string) => void;
	onClose: () => void;
};

const DEFAULT_VALUES: ConstraintRuleValues = {
	type: "STAFFING_REQUIREMENT",
	requirement: "MUST",
	condition: "",
	headcount: "",
	roleIds: [],
	shiftIds: [],
};

const key = "scheduling.constraints";

const isOneOf = <T extends string>(
	values: ReadonlyArray<T>,
	value: string
): value is T => (values as ReadonlyArray<string>).includes(value);

/**
 * Builds one constraint rule from its parts, read back as a sentence while
 * it is chosen. Mount when opened and unmount when closed so every attempt
 * starts fresh.
 */
export const AddConstraintDialog = ({
	roles,
	shifts,
	onSubmit,
	onClose,
}: AddConstraintDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const formId = useId();
	const schema = useMemo(() => constraintRuleSchema(t), [t]);
	const {
		control,
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<ConstraintRuleValues, unknown, ConstraintRule>({
		resolver: zodResolver(schema),
		defaultValues: DEFAULT_VALUES,
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const values = useWatch({ control });
	const fieldId = (name: keyof ConstraintRuleValues): string =>
		`${formId}-${name}`;
	const describedBy = (name: keyof ConstraintRuleValues): string | undefined =>
		errors[name] ? formRowIds(fieldId(name)).errorId : undefined;

	const roleOptions: Array<SelectOption> = roles.map((role) => ({
		value: role.jobTitleId,
		label: role.name,
	}));
	const shiftOptions: Array<SelectOption> = shifts.map((shift) => ({
		value: shift.shiftId,
		label: shift.name,
	}));
	const namesOf = (
		options: Array<SelectOption>,
		chosen: Array<string> | undefined
	): string =>
		options
			.filter((option) => chosen?.includes(option.value))
			.map((option) => option.label)
			.join(", ");
	const summaryOf =
		(options: Array<SelectOption>, all: string) =>
		(selected: Array<SelectOption>): string =>
			selected.length === options.length
				? all
				: selected.map((option) => option.label).join(", ");
	const words = (
		rule: Pick<ConstraintRuleValues, "requirement" | "condition">
	): { requirement?: string; condition?: string } => ({
		requirement: isOneOf(RULE_REQUIREMENTS, rule.requirement)
			? t(`${key}.requirements.${rule.requirement}`)
			: undefined,
		condition: isOneOf(RULE_CONDITIONS, rule.condition)
			? t(`${key}.conditions.${rule.condition}`)
			: undefined,
	});
	const headcount = values.headcount?.trim() ?? "";

	return (
		<Modal
			open
			title={t(`${key}.dialog.title`)}
			footer={
				<>
					<Button
						variant="secondary"
						onClick={() => {
							reset(DEFAULT_VALUES);
						}}
					>
						{t(`${key}.dialog.reset`)}
					</Button>
					<Button form={formId} type="submit">
						{t(`${key}.dialog.save`)}
					</Button>
				</>
			}
			onClose={onClose}
		>
			<form
				noValidate
				className="flex flex-col gap-7 px-6 py-8"
				id={formId}
				onSubmit={(event) => {
					void handleSubmit((rule) => {
						onSubmit(
							rule,
							t(`${key}.preview.details`, {
								...words(rule),
								headcount: rule.headcount,
								roles: namesOf(roleOptions, rule.roleIds),
								shifts: namesOf(shiftOptions, rule.shiftIds),
							})
						);
					})(event);
				}}
			>
				<FormRow
					required
					htmlFor={fieldId("type")}
					label={t(`${key}.dialog.rule`)}
					layout="stacked"
				>
					<Controller
						control={control}
						name="type"
						render={({ field }) => (
							<Select
								ref={field.ref}
								aria-labelledby={formRowIds(fieldId("type")).labelId}
								className="w-full"
								name={field.name}
								value={field.value}
								options={CONSTRAINT_TYPES.map((type) => ({
									value: type,
									label: t(`${key}.types.${type}`),
								}))}
								onChange={(type) => {
									if (isOneOf(CONSTRAINT_TYPES, type)) field.onChange(type);
								}}
							/>
						)}
					/>
				</FormRow>
				<RulePreview
					values={{
						...words({
							requirement: values.requirement ?? "",
							condition: values.condition ?? "",
						}),
						headcount: /^\d+$/.test(headcount) ? headcount : undefined,
						roles: namesOf(roleOptions, values.roleIds),
						shifts: namesOf(shiftOptions, values.shiftIds),
					}}
				/>
				<div className="grid gap-4 sm:grid-cols-3">
					<FormRow
						required
						error={errors.requirement?.message}
						htmlFor={fieldId("requirement")}
						label={t(`${key}.dialog.requirement`)}
						layout="stacked"
					>
						<Controller
							control={control}
							name="requirement"
							render={({ field }) => (
								<Select
									ref={field.ref}
									aria-describedby={describedBy("requirement")}
									aria-labelledby={formRowIds(fieldId("requirement")).labelId}
									className="w-full"
									name={field.name}
									placeholder={t(`${key}.dialog.selectPlaceholder`)}
									status={errors.requirement ? "error" : undefined}
									value={field.value}
									options={RULE_REQUIREMENTS.map((requirement) => ({
										value: requirement,
										label: t(`${key}.requirements.${requirement}`),
									}))}
									onChange={field.onChange}
								/>
							)}
						/>
					</FormRow>
					<FormRow
						required
						error={errors.condition?.message}
						htmlFor={fieldId("condition")}
						label={t(`${key}.dialog.condition`)}
						layout="stacked"
					>
						<Controller
							control={control}
							name="condition"
							render={({ field }) => (
								<Select
									ref={field.ref}
									aria-describedby={describedBy("condition")}
									aria-labelledby={formRowIds(fieldId("condition")).labelId}
									className="w-full"
									name={field.name}
									placeholder={t(`${key}.dialog.selectPlaceholder`)}
									status={errors.condition ? "error" : undefined}
									value={field.value}
									options={RULE_CONDITIONS.map((condition) => ({
										value: condition,
										label: t(`${key}.conditions.${condition}`),
									}))}
									onChange={field.onChange}
								/>
							)}
						/>
					</FormRow>
					<FormRow
						required
						error={errors.headcount?.message}
						htmlFor={fieldId("headcount")}
						label={t(`${key}.dialog.headcount`)}
						layout="stacked"
					>
						<Input
							aria-describedby={describedBy("headcount")}
							aria-required="true"
							className="w-full"
							id={fieldId("headcount")}
							inputMode="numeric"
							max={HEADCOUNT_MAX}
							min={HEADCOUNT_MIN}
							placeholder={t(`${key}.dialog.enterPlaceholder`)}
							status={errors.headcount ? "error" : undefined}
							type="number"
							{...register("headcount")}
						/>
					</FormRow>
				</div>
				<FormRow
					required
					error={errors.roleIds?.message}
					htmlFor={fieldId("roleIds")}
					label={t(`${key}.dialog.roles`)}
					layout="stacked"
				>
					<Controller
						control={control}
						name="roleIds"
						render={({ field }) => (
							<Select
								ref={field.ref}
								multiple
								aria-describedby={describedBy("roleIds")}
								aria-labelledby={formRowIds(fieldId("roleIds")).labelId}
								className="w-full"
								options={roleOptions}
								placeholder={t(`${key}.dialog.selectPlaceholder`)}
								selectAllLabel={t(`${key}.dialog.selectAll`)}
								status={errors.roleIds ? "error" : undefined}
								value={field.value}
								formatSummary={summaryOf(
									roleOptions,
									t(`${key}.dialog.allRoles`)
								)}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormRow>
				<FormRow
					required
					error={errors.shiftIds?.message}
					htmlFor={fieldId("shiftIds")}
					label={t(`${key}.dialog.shifts`)}
					layout="stacked"
				>
					<Controller
						control={control}
						name="shiftIds"
						render={({ field }) => (
							<Select
								ref={field.ref}
								multiple
								aria-describedby={describedBy("shiftIds")}
								aria-labelledby={formRowIds(fieldId("shiftIds")).labelId}
								className="w-full"
								options={shiftOptions}
								placeholder={t(`${key}.dialog.selectPlaceholder`)}
								selectAllLabel={t(`${key}.dialog.selectAll`)}
								status={errors.shiftIds ? "error" : undefined}
								value={field.value}
								formatSummary={summaryOf(
									shiftOptions,
									t(`${key}.dialog.allShifts`)
								)}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormRow>
			</form>
		</Modal>
	);
};
