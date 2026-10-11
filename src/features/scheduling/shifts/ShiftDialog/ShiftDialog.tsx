import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Combobox } from "@/components/forms/Combobox";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select, type SelectOption } from "@/components/forms/Select";
import { SwatchPicker } from "@/components/forms/SwatchPicker";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SaveIcon, SwapIcon } from "@/components/ui/Icon";
import { UnitNameField } from "@/features/organisation/UnitNameField";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import { timeSteps, type Shift } from "@/features/scheduling/scheduleDraft";
import { WEEKDAYS, type ShiftBody } from "@/features/scheduling/shifts/api";
import {
	shiftSchema,
	type ShiftFormValues,
	type ShiftValues,
} from "@/features/scheduling/shifts/ShiftDialog/schema";
import { shiftRefusal } from "@/features/scheduling/shifts/shiftRefusal";
import { SHIFT_COLOURS } from "@/features/scheduling/shifts/shiftColours";
import type { ShiftRoleOptions } from "@/features/scheduling/shifts/useShiftRoleOptions";

export type ShiftDialogProps = {
	/** Set to change one of the department's shifts. */
	editing?: Shift;
	/** The department's active job titles, which the shift's roles are chosen from. */
	roles: ShiftRoleOptions;
	/** The groups the department's shifts already belong to; a new one may be created in place. */
	groups: Array<string>;
	/** Sends the shift; a rejection is explained on its field or as the alert. */
	onSave: (body: ShiftBody) => Promise<unknown>;
	onClose: () => void;
};

const FIELDS = [
	"name",
	"group",
	"colour",
	"startTime",
	"endTime",
	"days",
	"jobTitleIds",
] as const;

const TIME_OPTIONS: Array<SelectOption> = timeSteps().map((time) => ({
	value: time,
	label: time,
}));

const same = (a: string): string => a;

/**
 * Adds a shift to the department, or changes one; every draft of the
 * department sees it. Mount when opened and unmount when closed so every
 * attempt starts fresh; Reset returns the form to what it opened with.
 */
export const ShiftDialog = ({
	editing,
	roles,
	groups,
	onSave,
	onClose,
}: ShiftDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.shifts.dialog";
	const formId = useId();
	const fieldId = (name: keyof ShiftFormValues): string => `${formId}-${name}`;
	const schema = useMemo(() => shiftSchema(t), [t]);
	const form = useForm<ShiftFormValues, unknown, ShiftValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: editing?.name ?? "",
			group: editing?.group ?? "",
			colour: editing?.colour ?? "",
			startTime: editing?.startTime ?? "",
			endTime: editing?.endTime ?? "",
			days: editing?.days ?? [],
			jobTitleIds: editing?.roles.map((role) => role.jobTitleId) ?? [],
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
	const name = useWatch({ control, name: "name" });
	// Groups created here exist only in this dialog until a shift is saved with them.
	const [created, setCreated] = useState<Array<string>>([]);
	const [groupQuery, setGroupQuery] = useState("");
	const groupOptions = [...new Set([...groups, ...created])].filter((group) =>
		group.toLowerCase().includes(groupQuery.trim().toLowerCase())
	);
	const { message, alertRef, close, run } = useCreateFormSubmit(
		form,
		FIELDS,
		onClose
	);
	const describedBy = (
		field: keyof ShiftFormValues,
		hint = false
	): string | undefined => {
		const ids = formRowIds(fieldId(field));
		if (errors[field]) return ids.errorId;
		return hint ? ids.hintId : undefined;
	};
	const labelledBy = (field: keyof ShiftFormValues): string =>
		formRowIds(fieldId(field)).labelId;
	const colourOptions = SHIFT_COLOURS.map((colour) => ({
		value: colour.value,
		label: t(`scheduling.shiftColours.${colour.key}`),
	}));
	const dayOptions: Array<SelectOption> = WEEKDAYS.map((day) => ({
		value: day,
		label: t(`scheduling.dayNames.${day}`),
	}));
	const roleOptions: Array<SelectOption> =
		roles.status === "ready"
			? roles.items.map((role) => ({
					value: role.jobTitleId,
					label: role.name,
				}))
			: [];
	const rolesHint =
		roles.status === "pending"
			? t(`${key}.rolesLoading`)
			: roles.status === "hidden"
				? t(`${key}.rolesHidden`)
				: roles.status === "error"
					? t(`${key}.rolesFailed`)
					: roleOptions.length === 0
						? t(`${key}.rolesEmpty`)
						: t(`${key}.rolesHint`);
	const timeField = (field: "startTime" | "endTime"): FunctionComponent => (
		<FormRow
			required
			className="sm:flex-1"
			error={errors[field]?.message}
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
						aria-describedby={describedBy(field)}
						aria-labelledby={labelledBy(field)}
						className="w-full"
						name={control.name}
						options={TIME_OPTIONS}
						placeholder={t(`${key}.pleaseSelect`)}
						status={errors[field] ? "error" : undefined}
						value={control.value}
						onChange={control.onChange}
					/>
				)}
			/>
		</FormRow>
	);

	return (
		<Dialog
			open
			preventClose={isSubmitting}
			title={t(editing ? `${key}.editTitle` : `${key}.title`)}
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
						disabled={!name.trim()}
						form={formId}
						leadingIcon={<SaveIcon />}
						loading={isSubmitting}
						type="submit"
					>
						{t(`${key}.submit`)}
					</Button>
				</div>
			}
			onClose={close}
		>
			<form
				noValidate
				aria-busy={isSubmitting}
				className="space-y-6"
				id={formId}
				onSubmit={(event) =>
					handleSubmit(async (values) => {
						await run(
							() => onSave(values),
							(error) =>
								shiftRefusal(error, values.name, editing !== undefined, t)
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
				<FormRow
					required
					error={errors.group?.message}
					htmlFor={fieldId("group")}
					label={t(`${key}.group`)}
					layout="stacked"
				>
					<Controller
						control={control}
						name="group"
						render={({ field }) => (
							<Combobox
								ref={field.ref}
								aria-describedby={describedBy("group")}
								aria-labelledby={labelledBy("group")}
								getKey={same}
								getLabel={same}
								id={fieldId("group")}
								multiple={false}
								options={groupOptions}
								placeholder={t(`${key}.groupPlaceholder`)}
								query={groupQuery}
								searchPlaceholder={t(`${key}.groupSearch`)}
								status={errors.group ? "error" : undefined}
								value={field.value || null}
								onQueryChange={setGroupQuery}
								onChange={(group) => {
									field.onChange(group ?? "");
								}}
								onCreate={(group) => {
									setCreated((current) => [...current, group]);
									setGroupQuery("");
									field.onChange(group);
								}}
							/>
						)}
					/>
				</FormRow>
				<FormRow
					required
					error={errors.colour?.message}
					htmlFor={fieldId("colour")}
					label={t(`${key}.colour`)}
					layout="stacked"
				>
					<Controller
						control={control}
						name="colour"
						render={({ field }) => (
							<SwatchPicker
								aria-describedby={describedBy("colour")}
								aria-labelledby={labelledBy("colour")}
								id={fieldId("colour")}
								name={field.name}
								options={colourOptions}
								status={errors.colour ? "error" : undefined}
								value={field.value || undefined}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormRow>
				<div className="flex flex-col gap-6 sm:flex-row">
					{timeField("startTime")}
					{timeField("endTime")}
				</div>
				<div className="flex flex-col gap-6 sm:flex-row">
					<FormRow
						className="sm:flex-1"
						error={errors.days?.message}
						htmlFor={fieldId("days")}
						label={t(`${key}.days`)}
						layout="stacked"
					>
						<Controller
							control={control}
							name="days"
							render={({ field }) => (
								<Select
									ref={field.ref}
									multiple
									aria-describedby={describedBy("days")}
									aria-labelledby={labelledBy("days")}
									className="w-full"
									name={field.name}
									options={dayOptions}
									placeholder={t(`${key}.pleaseSelect`)}
									selectAllLabel={t(`${key}.selectAll`)}
									status={errors.days ? "error" : undefined}
									value={field.value}
									onChange={field.onChange}
								/>
							)}
						/>
					</FormRow>
					<FormRow
						className="sm:flex-1"
						error={errors.jobTitleIds?.message}
						hint={rolesHint}
						htmlFor={fieldId("jobTitleIds")}
						label={t(`${key}.roles`)}
						layout="stacked"
					>
						<Controller
							control={control}
							name="jobTitleIds"
							render={({ field }) => (
								<Select
									ref={field.ref}
									multiple
									aria-describedby={describedBy("jobTitleIds", true)}
									aria-labelledby={labelledBy("jobTitleIds")}
									className="w-full"
									disabled={roles.status !== "ready"}
									emptyText={t(`${key}.rolesEmpty`)}
									name={field.name}
									options={roleOptions}
									placeholder={t(`${key}.pleaseSelect`)}
									selectAllLabel={t(`${key}.selectAll`)}
									status={errors.jobTitleIds ? "error" : undefined}
									value={field.value}
									onChange={field.onChange}
								/>
							)}
						/>
					</FormRow>
				</div>
			</form>
		</Dialog>
	);
};
