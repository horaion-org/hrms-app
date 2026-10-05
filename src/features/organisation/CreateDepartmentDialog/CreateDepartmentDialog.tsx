import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import { refusalFor } from "@/features/organisation/CreateDepartmentDialog/refusalFor";
import {
	createDepartmentSchema,
	type CreateDepartmentValues,
} from "@/features/organisation/CreateDepartmentDialog/schema";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { HeadsField } from "@/features/organisation/HeadsField";
import { UnitNameField } from "@/features/organisation/UnitNameField";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import { useCreateDepartment } from "@/features/organisation/useCreateInOrganisation";
import { useBranches } from "@/features/organisation/useOrganisationList";

export type CreateDepartmentDialogProps = {
	companyId: string;
	onClose: () => void;
};

const FIELDS = ["branchId", "name", "heads"] as const;
const ACTIVE_BRANCHES = {
	sort: { field: "name", desc: false },
	status: "ACTIVE",
} as const;

/** Mount when opened and unmount when closed so every attempt starts fresh. */
export const CreateDepartmentDialog = ({
	companyId,
	onClose,
}: CreateDepartmentDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const client = useQueryClient();
	const key = "organisation.departments.createDialog";
	const formId = useId();
	const branchId = `${formId}-branch`;
	const branchIds = formRowIds(branchId);
	const schema = useMemo(() => createDepartmentSchema(t), [t]);
	const form = useForm<CreateDepartmentValues>({
		resolver: zodResolver(schema),
		defaultValues: { branchId: "", name: "", heads: [] },
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
	const [name, heads] = useWatch({ control, name: ["name", "heads"] });
	const branches = useBranches(companyId, ACTIVE_BRANCHES);
	const onlyBranch =
		branches.status === "ready" && branches.items.length === 1
			? branches.items[0]?.branchId
			: undefined;
	useEffect(() => {
		// One active branch leaves nothing to choose.
		if (onlyBranch && !getValues("branchId")) setValue("branchId", onlyBranch);
	}, [onlyBranch, getValues, setValue]);
	const create = useCreateDepartment(companyId);
	const submit = useCreateFormSubmit(form, FIELDS, onClose);
	const branchOptions =
		branches.status === "ready"
			? branches.items.map((branch) => ({
					value: branch.branchId,
					label: branch.name,
				}))
			: [];
	const branchError = errors.branchId?.message;
	return (
		<CreateFormDialog
			alertRef={submit.alertRef}
			cancelLabel={t(`${key}.cancel`)}
			description={t(`${key}.description`)}
			formId={formId}
			message={submit.message}
			submitDisabled={!name.trim() && heads.length === 0}
			submitLabel={t(`${key}.submit`)}
			submitting={isSubmitting}
			title={t(`${key}.title`)}
			onClose={submit.close}
			onSubmit={(event) =>
				handleSubmit(async (values) => {
					const refusal = await submit.run(
						() =>
							create.mutateAsync({
								branchId: values.branchId,
								body: {
									name: values.name,
									initialHeadCompanyMembershipIds: values.heads.map(
										(head) => head.membershipId
									),
								},
							}),
						(error) => refusalFor(error, values.name, t)
					);
					if (refusal?.fields.branchId)
						void client.invalidateQueries({
							queryKey: ["organisation", companyId, "branches"],
						});
					if (refusal?.refreshMembers)
						void client.invalidateQueries({
							queryKey: ["organisation", companyId, "members"],
						});
				})(event)
			}
		>
			<FormRow
				required
				error={branchError}
				htmlFor={branchId}
				label={t(`${key}.branch`)}
				layout="stacked"
				hint={
					branches.status === "pending"
						? t(`${key}.branchesLoading`)
						: branches.status === "error"
							? t(`${key}.branchesFailed`)
							: branchOptions.length === 0
								? t(`${key}.branchesEmpty`)
								: t(`${key}.branchHint`)
				}
			>
				<Controller
					control={control}
					name="branchId"
					render={({ field }) => (
						<Select
							ref={field.ref}
							aria-invalid={Boolean(branchError)}
							aria-labelledby={branchIds.labelId}
							className="w-full"
							disabled={isSubmitting || branchOptions.length === 0}
							name={field.name}
							options={branchOptions}
							placeholder={t(`${key}.branchPlaceholder`)}
							status={branchError ? "error" : undefined}
							value={field.value}
							aria-describedby={
								branchError ? branchIds.errorId : branchIds.hintId
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
			<Controller
				control={control}
				name="heads"
				render={({ field }) => (
					<HeadsField
						ref={field.ref}
						companyId={companyId}
						disabled={isSubmitting}
						error={errors.heads?.message}
						hint={t(`${key}.headsHint`)}
						id={`${formId}-heads`}
						label={t(`${key}.heads`)}
						placeholder={t(`${key}.headsPlaceholder`)}
						value={field.value}
						onChange={field.onChange}
					/>
				)}
			/>
		</CreateFormDialog>
	);
};
