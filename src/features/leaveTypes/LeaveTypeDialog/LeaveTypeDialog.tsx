import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo, useState } from "react";
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
	countsTowardsWorkHoursAfterPaidChange,
	initialLeaveTypeValues,
	leaveTypeBodyOf,
	leaveTypeSchema,
	type LeaveTypeValues,
} from "@/features/leaveTypes/LeaveTypeDialog/schema";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { UnitNameField } from "@/features/organisation/UnitNameField";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import type { UnitReachChoices } from "@/features/workspace/unitReach";
import { UnitReachField } from "@/features/workspace/UnitReachField";
import {
	NAME_LIMITS,
	NAME_MAX_LENGTH,
} from "@/features/organisation/nameSchema";

export type LeaveTypeDialogProps = {
	/** Set to edit an existing type; its status stays as it is. */
	editing?: ManagedLeaveType & { grantKind: LeaveGrantKind };
	/** The Branches and Departments the Applies to field offers. */
	reachChoices: UnitReachChoices;
	/** Saves the type; a rejection is shown in the dialog. */
	onSave: (body: LeaveTypeBody) => Promise<unknown>;
	onClose: () => void;
};

const FIELDS = ["name"] as const;
const key = "settings.leave.dialog";

/**
 * Adds a leave type to the company's catalogue, or edits one: its name, how
 * it is counted, whether it is paid, whether a day of it counts towards the
 * week's work hours (a new type's follows Paid until set by hand), whether
 * applying asks for a reason, whether it can be taken in part days and where
 * it applies: the whole company, chosen Branches or chosen Departments.
 * Once any request uses the type, how it is counted is fixed, as the API
 * keeps it. Mount when opened and unmount when closed so every attempt starts
 * fresh.
 */
export const LeaveTypeDialog = ({
	editing,
	reachChoices,
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
		getValues,
		setValue,
		formState: { errors, isSubmitting },
	} = form;
	const name = useWatch({ control, name: "name" });
	const submit = useCreateFormSubmit(form, FIELDS, onClose);
	// Once the person sets the work-hours box themselves, Paid no longer moves it.
	const [countsSetByPerson, setCountsSetByPerson] = useState(false);
	// The API refuses a new kind once any request uses the type, so it is not offered.
	// An earned type (Off in lieu) keeps its kind: it draws on time off earned, and is the only kind shown.
	const earned = editing?.grantKind === "EARNED";
	const kindFixed = earned || (editing?.requestCount ?? 0) > 0;
	const kinds: ReadonlyArray<LeaveGrantKind> = earned
		? ["EARNED"]
		: LEAVE_GRANT_KINDS;
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
				disabled={isSubmitting}
				error={errors.name?.message}
				hint={t(`${key}.nameHint`, NAME_LIMITS)}
				id={`${formId}-name`}
				label={t(`${key}.name`)}
				placeholder={t(`${key}.namePlaceholder`)}
				registration={register("name")}
				counter={t(`${key}.nameCounter`, {
					count: name.length,
					max: NAME_MAX_LENGTH,
				})}
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
							{kinds.map((kind) => (
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
								{earned
									? t(`${key}.kindEarned`)
									: t(`${key}.kindFixed`, {
											count: editing?.requestCount ?? 0,
										})}
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
							setValue(
								"countsTowardsWorkHours",
								countsTowardsWorkHoursAfterPaidChange({
									adding: editing === undefined,
									setByPerson: countsSetByPerson,
									paid: event.target.checked,
									countsTowardsWorkHours: getValues("countsTowardsWorkHours"),
								})
							);
						}}
					/>
				)}
			/>
			<Controller
				control={control}
				name="countsTowardsWorkHours"
				render={({ field }) => (
					<Checkbox
						checked={field.value}
						description={t(`${key}.countsTowardsWorkHoursDescription`)}
						disabled={isSubmitting}
						label={t(`${key}.countsTowardsWorkHours`)}
						name={field.name}
						onBlur={field.onBlur}
						onChange={(event) => {
							field.onChange(event.target.checked);
							setCountsSetByPerson(true);
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
			<Controller
				control={control}
				name="allowsPartDays"
				render={({ field }) => (
					<Checkbox
						checked={field.value}
						description={t(`${key}.allowsPartDaysDescription`)}
						disabled={isSubmitting}
						label={t(`${key}.allowsPartDays`)}
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
				name="reach"
				render={({ field }) => (
					<UnitReachField
						choices={reachChoices}
						disabled={isSubmitting}
						idPrefix={`${formId}-reach`}
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
