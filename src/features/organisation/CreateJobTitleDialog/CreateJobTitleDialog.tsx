import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select, type SelectOption } from "@/components/forms/Select";
import type { JobTitle } from "@/features/organisation/api";
import { placeOf } from "@/features/organisation/assignmentTargets";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { departmentChoices } from "@/features/organisation/departmentChoices";
import { refusalFor } from "@/features/organisation/CreateJobTitleDialog/refusalFor";
import {
	createJobTitleSchema,
	type CreateJobTitleValues,
} from "@/features/organisation/CreateJobTitleDialog/schema";
import { UnitNameField } from "@/features/organisation/UnitNameField";
import { useUpdateJobTitle } from "@/features/organisation/useChangeListRow";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import { useCreateJobTitle } from "@/features/organisation/useCreateInOrganisation";
import {
	useBranches,
	useDepartments,
} from "@/features/organisation/useOrganisationList";
import { useCan } from "@/features/workspace/useCan";

export type CreateJobTitleDialogProps = {
	companyId: string;
	/** Set to rename an existing Job title; its Department is shown but can't change. */
	editing?: JobTitle;
	onClose: () => void;
};

const FIELDS = ["departmentId", "name"] as const;
const ACTIVE_BY_NAME = {
	sort: { field: "name", desc: false },
	status: "ACTIVE",
} as const;

/**
 * Creates a Job title in one Department, or renames one. Mount when opened
 * and unmount when closed so every attempt starts fresh.
 */
export const CreateJobTitleDialog = ({
	companyId,
	editing,
	onClose,
}: CreateJobTitleDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const can = useCan();
	const client = useQueryClient();
	const key = "organisation.jobTitles.createDialog";
	const formId = useId();
	const departmentId = `${formId}-department`;
	const departmentIds = formRowIds(departmentId);
	const schema = useMemo(() => createJobTitleSchema(t), [t]);
	const form = useForm<CreateJobTitleValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			departmentId: editing?.departmentId ?? "",
			name: editing?.name ?? "",
		},
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
	const branches = useBranches(companyId, ACTIVE_BY_NAME);
	const departments = useDepartments(companyId, ACTIVE_BY_NAME);
	const create = useCreateJobTitle(companyId);
	const update = useUpdateJobTitle(companyId);
	const submit = useCreateFormSubmit(form, FIELDS, onClose);
	// Only departments where the person may create job titles are offered; when editing, just the title's own.
	const departmentOptions: Array<SelectOption> = editing
		? [
				{
					value: editing.departmentId,
					label: placeOf(editing, t),
				},
			]
		: branches.status === "ready" && departments.status === "ready"
			? departmentChoices(
					branches.items,
					departments.items,
					(departmentId) => can("job_title:create", departmentId),
					t
				).map(({ department, label }) => ({
					value: department.departmentId,
					label,
				}))
			: [];
	const onlyDepartment =
		departmentOptions.length === 1 ? departmentOptions[0]?.value : undefined;
	useEffect(() => {
		// One department leaves nothing to choose.
		if (onlyDepartment && !getValues("departmentId"))
			setValue("departmentId", onlyDepartment);
	}, [onlyDepartment, getValues, setValue]);
	const loading =
		branches.status === "pending" || departments.status === "pending";
	const failed = branches.status === "error" || departments.status === "error";
	const departmentError = errors.departmentId?.message;
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
					? t(`${key}.editDescription`, { department: placeOf(editing, t) })
					: t(`${key}.description`)
			}
			onClose={submit.close}
			onSubmit={(event) =>
				handleSubmit(async (values) => {
					const refusal = await submit.run(
						() => {
							if (editing)
								return update.mutateAsync({ ...editing, name: values.name });
							const department =
								departments.status === "ready"
									? departments.items.find(
											(item) => item.departmentId === values.departmentId
										)
									: undefined;
							return create.mutateAsync({
								branchId: department?.branchId ?? "",
								departmentId: values.departmentId,
								body: { name: values.name },
							});
						},
						(error) => refusalFor(error, values.name, editing !== undefined, t)
					);
					if (refusal?.fields.departmentId)
						void client.invalidateQueries({
							queryKey: ["organisation", companyId, "departments"],
						});
				})(event)
			}
		>
			<FormRow
				required
				error={departmentError}
				htmlFor={departmentId}
				label={t(`${key}.department`)}
				layout="stacked"
				hint={
					editing
						? undefined
						: loading
							? t(`${key}.departmentsLoading`)
							: failed
								? t(`${key}.departmentsFailed`)
								: departmentOptions.length === 0
									? t(`${key}.departmentsEmpty`)
									: t(`${key}.departmentHint`)
				}
			>
				<Controller
					control={control}
					name="departmentId"
					render={({ field }) => (
						<Select
							ref={field.ref}
							aria-invalid={Boolean(departmentError)}
							aria-labelledby={departmentIds.labelId}
							className="w-full"
							name={field.name}
							options={departmentOptions}
							placeholder={t(`${key}.departmentPlaceholder`)}
							status={departmentError ? "error" : undefined}
							value={field.value}
							aria-describedby={
								departmentError ? departmentIds.errorId : departmentIds.hintId
							}
							disabled={
								isSubmitting ||
								editing !== undefined ||
								departmentOptions.length === 0
							}
							onChange={field.onChange}
						/>
					)}
				/>
			</FormRow>
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
		</CreateFormDialog>
	);
};
