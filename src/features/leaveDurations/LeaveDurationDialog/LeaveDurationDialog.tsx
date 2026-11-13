import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { TimeSelect } from "@/components/forms/TimeSelect";
import { durationText, minutesBetween } from "@/features/leave/leaveLength";
import type {
	LeaveDurationBody,
	ManagedLeaveDuration,
} from "@/features/leaveDurations/api";
import { refusalFor } from "@/features/leaveDurations/LeaveDurationDialog/refusalFor";
import {
	initialLeaveDurationValues,
	leaveDurationBodyOf,
	leaveDurationSchema,
	type LeaveDurationValues,
} from "@/features/leaveDurations/LeaveDurationDialog/schema";
import type { ManageableReach } from "@/features/leaveDurations/manageableReach";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { UnitNameField } from "@/features/organisation/UnitNameField";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import { UnitReachField } from "@/features/workspace/UnitReachField";

export type LeaveDurationDialogProps = {
	/** Set to edit an existing duration; its status and place stay as they are. */
	editing?: ManagedLeaveDuration;
	/** The reaches and units the person may save (`manageableReach`). */
	reach: ManageableReach;
	/** Saves the duration; a rejection is shown in the dialog. */
	onSave: (body: LeaveDurationBody) => Promise<unknown>;
	onClose: () => void;
};

const FIELDS = ["name", "endTime"] as const;
const key = "settings.leave.durationDialog";

/**
 * Adds a leave duration, or edits one: its name, when it starts and ends (an
 * end before the start runs into the next day), and where it applies. It
 * counts as the hours between its times, shown under the pair. Applies to
 * offers only the reaches and units the person manages, as the API's
 * coverage rule allows. Mount when opened and unmount when closed so every
 * attempt starts fresh.
 */
export const LeaveDurationDialog = ({
	editing,
	reach,
	onSave,
	onClose,
}: LeaveDurationDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const formId = useId();
	const schema = useMemo(() => leaveDurationSchema(t), [t]);
	const form = useForm<LeaveDurationValues>({
		resolver: zodResolver(schema),
		defaultValues: initialLeaveDurationValues(editing, reach),
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const {
		register,
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = form;
	const [name, startTime, endTime] = useWatch({
		control,
		name: ["name", "startTime", "endTime"],
	});
	const submit = useCreateFormSubmit(form, FIELDS, onClose);
	const length = startTime && endTime ? minutesBetween(startTime, endTime) : 0;
	const lengthHint =
		length === 0
			? undefined
			: endTime < startTime
				? t(`${key}.lengthNextDay`, { length: durationText(length, t) })
				: t(`${key}.length`, { length: durationText(length, t) });
	const timeField = (
		field: "startTime" | "endTime",
		hint?: string
	): FunctionComponent => {
		const id = `${formId}-${field}`;
		const ids = formRowIds(id);
		const error = errors[field]?.message;
		return (
			<FormRow
				required
				className="sm:flex-1"
				error={error}
				hint={hint}
				htmlFor={id}
				label={t(`${key}.${field}`)}
				layout="stacked"
			>
				<Controller
					control={control}
					name={field}
					render={({ field: control }) => (
						<TimeSelect
							ref={control.ref}
							aria-labelledby={ids.labelId}
							className="w-full"
							disabled={isSubmitting}
							name={control.name}
							placeholder={t(`${key}.pleaseSelect`)}
							status={error ? "error" : undefined}
							value={control.value}
							aria-describedby={
								error ? ids.errorId : hint ? ids.hintId : undefined
							}
							onChange={control.onChange}
						/>
					)}
				/>
			</FormRow>
		);
	};
	return (
		<CreateFormDialog
			alertRef={submit.alertRef}
			cancelLabel={t(`${key}.cancel`)}
			formId={formId}
			message={submit.message}
			submitDisabled={!name.trim()}
			submitLabel={t(editing ? `${key}.editSubmit` : `${key}.submit`)}
			submitting={isSubmitting}
			title={t(editing ? `${key}.editTitle` : `${key}.title`)}
			description={
				editing
					? t(`${key}.editDescription`, { name: editing.name })
					: t(`${key}.description`)
			}
			onClose={submit.close}
			onSubmit={(event) =>
				handleSubmit(async (values) => {
					await submit.run(
						() => onSave(leaveDurationBodyOf(values)),
						(error) => refusalFor(error, editing !== undefined, t)
					);
				})(event)
			}
		>
			<UnitNameField
				autoFocus
				counter={t(`${key}.nameCounter`, { count: name.length })}
				disabled={isSubmitting}
				error={errors.name?.message}
				hint={t(`${key}.nameHint`)}
				id={`${formId}-name`}
				label={t(`${key}.name`)}
				placeholder={t(`${key}.namePlaceholder`)}
				registration={register("name")}
			/>
			<div className="flex flex-col gap-6 sm:flex-row">
				{timeField("startTime")}
				{timeField("endTime", lengthHint)}
			</div>
			<Controller
				control={control}
				name="reach"
				render={({ field }) => (
					<UnitReachField
						choices={reach.choices}
						disabled={isSubmitting}
						idPrefix={`${formId}-reach`}
						reaches={reach.reaches}
						value={field.value}
						error={
							errors.reach?.branchIds?.message ??
							errors.reach?.departmentIds?.message
						}
						onChange={field.onChange}
					/>
				)}
			/>
		</CreateFormDialog>
	);
};
