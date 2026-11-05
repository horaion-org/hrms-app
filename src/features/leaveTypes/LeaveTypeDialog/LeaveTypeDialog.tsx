import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { RadioCard } from "@/components/forms/RadioCard";
import { Checkbox } from "@/components/ui/Checkbox";
import {
	LEAVE_GRANT_KINDS,
	type LeaveGrantKind,
	type LeaveTypeBody,
	type ManagedLeaveType,
} from "@/features/leaveTypes/api";
import { refusalFor } from "@/features/leaveTypes/LeaveTypeDialog/refusalFor";
import {
	initialLeaveTypeValues,
	leaveTypeBodyOf,
	leaveTypeSchema,
	type LeaveTypeValues,
} from "@/features/leaveTypes/LeaveTypeDialog/schema";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { UnitNameField } from "@/features/organisation/UnitNameField";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";

export type LeaveTypeDialogProps = {
	/** Set to edit an existing type; its status stays as it is. */
	editing?: ManagedLeaveType & { grantKind: LeaveGrantKind };
	/** Saves the type; a rejection is shown in the dialog. */
	onSave: (body: LeaveTypeBody) => Promise<unknown>;
	onClose: () => void;
};

const FIELDS = ["name"] as const;
const key = "settings.leave.dialog";

/**
 * Adds a leave type to the company's catalogue, or edits one: its name, how
 * it is counted, whether it is paid and whether applying asks for a reason.
 * Once any request uses the type, how it is counted is fixed, as the API
 * keeps it. Mount when opened and unmount when closed so every attempt starts
 * fresh.
 */
export const LeaveTypeDialog = ({
	editing,
	onSave,
	onClose,
}: LeaveTypeDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const formId = useId();
	const kindLabelId = `${formId}-kind-label`;
	const kindHintId = `${formId}-kind-hint`;
	const schema = useMemo(() => leaveTypeSchema(t), [t]);
	const form = useForm<LeaveTypeValues>({
		resolver: zodResolver(schema),
		defaultValues: initialLeaveTypeValues(editing),
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const {
		register,
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = form;
	const name = useWatch({ control, name: "name" });
	const submit = useCreateFormSubmit(form, FIELDS, onClose);
	// The API refuses a new kind once any request uses the type, so it is not offered.
	const kindFixed = (editing?.requestCount ?? 0) > 0;
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
						() => onSave(leaveTypeBodyOf(values)),
						(error) => refusalFor(error, values.name, editing !== undefined, t)
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
			<Controller
				control={control}
				name="grantKind"
				render={({ field }) => (
					<div className="flex flex-col gap-2">
						<p className="text-sm text-neutral-800" id={kindLabelId}>
							{t(`${key}.kind`)}
						</p>
						<div
							aria-describedby={kindFixed ? kindHintId : undefined}
							aria-labelledby={kindLabelId}
							className="grid gap-4"
							role="radiogroup"
						>
							{LEAVE_GRANT_KINDS.map((kind) => (
								<RadioCard
									key={kind}
									checked={field.value === kind}
									description={t(`${key}.kindDescription.${kind}`)}
									disabled={isSubmitting || kindFixed}
									label={t(`leave.grantKinds.${kind}`)}
									name={`${formId}-kind`}
									value={kind}
									onChange={field.onChange}
								/>
							))}
						</div>
						{kindFixed && (
							<p className="text-xs text-neutral-600" id={kindHintId}>
								{t(`${key}.kindFixed`, { count: editing?.requestCount ?? 0 })}
							</p>
						)}
					</div>
				)}
			/>
			<Controller
				control={control}
				name="paid"
				render={({ field }) => (
					<Checkbox
						checked={field.value}
						description={t(`${key}.paidDescription`)}
						disabled={isSubmitting}
						label={t(`${key}.paid`)}
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
				name="requiresReason"
				render={({ field }) => (
					<Checkbox
						checked={field.value}
						description={t(`${key}.requiresReasonDescription`)}
						disabled={isSubmitting}
						label={t(`${key}.requiresReason`)}
						name={field.name}
						onBlur={field.onBlur}
						onChange={(event) => {
							field.onChange(event.target.checked);
						}}
					/>
				)}
			/>
		</CreateFormDialog>
	);
};
