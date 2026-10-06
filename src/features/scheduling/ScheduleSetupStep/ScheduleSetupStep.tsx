import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import type { Department } from "@/features/organisation/api";
import type { OrganisationList } from "@/features/organisation/useOrganisationList";
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

export type ScheduleSetupStepProps = {
	/** Lets the step's Next button, outside the form, submit it. */
	formId: string;
	defaultValues: ScheduleSetupValues;
	/** The Company's active departments to schedule. */
	departments: OrganisationList<Department>;
	periods: Array<SchedulePeriod>;
	onSubmit: (values: ScheduleSetupValues) => void;
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

/** Which department and week the schedule is for, and how leave and open shifts count. */
export const ScheduleSetupStep = ({
	formId,
	defaultValues,
	departments,
	periods,
	onSubmit,
	className,
}: ScheduleSetupStepProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const schema = useMemo(() => scheduleSetupSchema(t), [t]);
	const {
		register,
		control,
		handleSubmit,
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
	const departmentOptions =
		departments.status === "ready"
			? departments.items.map((department) => ({
					value: department.departmentId,
					label: department.name,
				}))
			: [];
	const departmentHint =
		departments.status === "hidden"
			? t("scheduling.setup.departmentsHidden")
			: departments.status === "error"
				? t("scheduling.setup.departmentsError")
				: undefined;
	const language = i18n.resolvedLanguage ?? i18n.language;
	const periodOptions = periods.map((period) => ({
		value: period.start,
		label: formatPeriod(period, language),
	}));

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
					void handleSubmit(onSubmit)(event);
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
								render={({ field }) => (
									<Select
										ref={field.ref}
										aria-describedby={describedBy("departmentId", true)}
										aria-invalid={errors.departmentId ? true : undefined}
										className="w-full"
										disabled={departments.status !== "ready"}
										name={field.name}
										options={departmentOptions}
										status={errors.departmentId ? "error" : undefined}
										value={field.value}
										aria-labelledby={
											formRowIds(fieldId("departmentId")).labelId
										}
										placeholder={
											departments.status === "pending"
												? t("scheduling.setup.departmentsLoading")
												: t("scheduling.setup.departmentPlaceholder")
										}
										onChange={field.onChange}
									/>
								)}
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
