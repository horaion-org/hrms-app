import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useId, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import {
	formatPeriod,
	type SchedulePeriod,
} from "@/features/scheduling/periods";
import {
	SCHEDULE_NAME_MAX_LENGTH,
	scheduleSetupSchema,
	type ScheduleSetupValues,
} from "@/features/scheduling/setupSchema";
import { StepPanel } from "@/features/scheduling/StepPanel";
import { workspaceQuery } from "@/features/workspace/api";
import { DepartmentSelector } from "@/features/workspace/DepartmentSelector";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { departmentChoices } from "@/features/workspace/unitChoices";

/** Why the API refused a setup field, per field. */
export type SetupFieldErrors = Partial<
	Record<keyof ScheduleSetupValues, string>
>;

export type ScheduleSetupStepProps = {
	/** Lets the step's Next button, outside the form, submit it. */
	formId: string;
	companyId: string;
	defaultValues: ScheduleSetupValues;
	periods: Array<SchedulePeriod>;
	/**
	 * Set once the draft is saved: its department, shown and no longer
	 * chosen, since a draft's department never changes.
	 */
	lockedDepartment?: { departmentId: string; label: string };
	/** Shows the setup without letting it change: a generated schedule, or one the person may not change. */
	readOnly?: boolean;
	/** Saves the setup; what it answers lands on the refused fields. */
	onSubmit: (
		values: ScheduleSetupValues
	) => Promise<SetupFieldErrors | undefined>;
	className?: string;
};

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

/** A new draft's department is one where the person may create schedules. */
const CREATE_KEYS: ReadonlyArray<PermissionKey> = ["schedule:create"];

/**
 * Which department and week the schedule is for, and how leave and open
 * shifts count. A new draft's department is chosen from the active ones
 * where the person may create schedules, as the workspace offers them.
 */
export const ScheduleSetupStep = ({
	formId,
	companyId,
	defaultValues,
	periods,
	lockedDepartment,
	readOnly = false,
	onSubmit,
	className,
}: ScheduleSetupStepProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const workspace = useQuery({ ...workspaceQuery, retry });
	const schema = useMemo(() => scheduleSetupSchema(t), [t]);
	const {
		register,
		control,
		handleSubmit,
		setError,
		setFocus,
		formState: { errors },
	} = useForm<ScheduleSetupValues>({
		resolver: zodResolver(schema),
		defaultValues,
		mode: "onTouched",
	});
	const idPrefix = useId();
	const fieldId = (name: keyof ScheduleSetupValues): string =>
		`${idPrefix}-${name}`;
	const describedBy = (
		name: keyof ScheduleSetupValues,
		hint = false
	): string | undefined => {
		const ids = formRowIds(fieldId(name));
		if (errors[name]) return ids.errorId;
		return hint ? ids.hintId : undefined;
	};
	// The selector offers nothing without a workspace or a department to create in; say why.
	const noDepartments =
		workspace.data !== undefined &&
		departmentChoices(workspace.data, companyId, CREATE_KEYS, {
			activeOnly: true,
		}).length === 0;
	const departmentHint = lockedDepartment
		? t("scheduling.setup.departmentLocked")
		: workspace.data === undefined && workspace.isError
			? t("scheduling.setup.departmentsError")
			: noDepartments
				? t("scheduling.setup.departmentsNone")
				: undefined;
	const language = i18n.resolvedLanguage ?? i18n.language;
	const periodOptions = periods.map((period) => ({
		value: period.start,
		label: formatPeriod(period, language),
	}));
	const save = async (values: ScheduleSetupValues): Promise<void> => {
		const refused = await onSubmit(values);
		const fields = Object.keys(refused ?? {}) as Array<
			keyof ScheduleSetupValues
		>;
		for (const name of fields)
			setError(name, { type: "server", message: refused?.[name] });
		const [first] = fields;
		if (first) setFocus(first);
	};

	return (
		<StepPanel
			className={className}
			description={t("scheduling.setup.description")}
			title={t("scheduling.setup.title")}
		>
			<form
				noValidate
				id={formId}
				onSubmit={(event) => {
					void handleSubmit(save)(event);
				}}
			>
				<div className="mt-10 flex flex-col gap-8">
					<div className="flex flex-col gap-8 sm:flex-row">
						<FormRow
							required
							className="sm:w-57"
							error={errors.departmentId?.message}
							hint={departmentHint}
							htmlFor={fieldId("departmentId")}
							label={t("scheduling.setup.department")}
							layout="stacked"
						>
							<Controller
								control={control}
								name="departmentId"
								render={({ field }) => {
									const shared = {
										"aria-describedby": describedBy("departmentId", true),
										"aria-invalid": errors.departmentId ? true : undefined,
										"aria-labelledby": formRowIds(fieldId("departmentId"))
											.labelId,
										className: "w-full",
										name: field.name,
										placeholder: t("scheduling.setup.departmentPlaceholder"),
										status: errors.departmentId
											? ("error" as const)
											: undefined,
										value: field.value,
										onChange: field.onChange,
									};
									return lockedDepartment ? (
										<Select
											ref={field.ref}
											disabled
											{...shared}
											options={[
												{
													value: lockedDepartment.departmentId,
													label: lockedDepartment.label,
												},
											]}
										/>
									) : (
										<DepartmentSelector
											ref={field.ref}
											activeOnly
											companyId={companyId}
											disabled={readOnly}
											keys={CREATE_KEYS}
											{...shared}
										/>
									);
								}}
							/>
						</FormRow>
						<FormRow
							required
							className="sm:w-97.5"
							error={errors.name?.message}
							htmlFor={fieldId("name")}
							label={t("scheduling.setup.name")}
							layout="stacked"
						>
							<Input
								aria-describedby={describedBy("name")}
								aria-required="true"
								className="w-full"
								id={fieldId("name")}
								maxLength={SCHEDULE_NAME_MAX_LENGTH}
								placeholder={t("scheduling.setup.namePlaceholder")}
								readOnly={readOnly}
								status={errors.name ? "error" : undefined}
								{...register("name")}
							/>
						</FormRow>
					</div>
					<div className="flex flex-col gap-8 sm:flex-row sm:items-end">
						<FormRow
							required
							className="sm:w-57"
							error={errors.periodStart?.message}
							htmlFor={fieldId("periodStart")}
							label={t("scheduling.setup.period")}
							layout="stacked"
						>
							<Controller
								control={control}
								name="periodStart"
								render={({ field }) => (
									<Select
										ref={field.ref}
										aria-describedby={describedBy("periodStart")}
										aria-labelledby={formRowIds(fieldId("periodStart")).labelId}
										className="w-full"
										disabled={readOnly}
										name={field.name}
										options={periodOptions}
										status={errors.periodStart ? "error" : undefined}
										value={field.value}
										onChange={field.onChange}
									/>
								)}
							/>
						</FormRow>
						<Callout className="flex-1">
							{t("scheduling.setup.periodNote")}
						</Callout>
					</div>
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
									disabled={readOnly}
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
			</form>
		</StepPanel>
	);
};
