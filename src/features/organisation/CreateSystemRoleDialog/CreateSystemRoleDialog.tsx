import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { refusalFor } from "@/features/organisation/CreateSystemRoleDialog/refusalFor";
import {
	createSystemRoleSchema,
	type CreateSystemRoleValues,
} from "@/features/organisation/CreateSystemRoleDialog/schema";
import { PermissionsGrid } from "@/features/organisation/PermissionsGrid";
import { PERMISSION_KEYS } from "@/features/organisation/permissionCatalogue";
import { UnitNameField } from "@/features/organisation/UnitNameField";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import { useCreateAccessRole } from "@/features/organisation/useCreateInOrganisation";

export type CreateSystemRoleDialogProps = {
	companyId: string;
	/**
	 * The permissions the person holds company-wide. Only these can be granted
	 * (the API's subset rule), so every other box is disabled.
	 */
	heldPermissions: ReadonlySet<string>;
	/** What the form starts from when duplicating a role; empty otherwise. */
	initial?: CreateSystemRoleValues;
	onClose: () => void;
};

const FIELDS = ["name", "permissions"] as const;
const EMPTY: CreateSystemRoleValues = { name: "", permissions: [] };

/** Mount when opened and unmount when closed so every attempt starts fresh. */
export const CreateSystemRoleDialog = ({
	companyId,
	heldPermissions,
	initial = EMPTY,
	onClose,
}: CreateSystemRoleDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "organisation.accessRoles.createDialog";
	const formId = useId();
	const schema = useMemo(() => createSystemRoleSchema(t), [t]);
	const form = useForm<CreateSystemRoleValues>({
		resolver: zodResolver(schema),
		defaultValues: initial,
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const {
		register,
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = form;
	const [name, permissions] = useWatch({
		control,
		name: ["name", "permissions"],
	});
	const holdsEverything = PERMISSION_KEYS.every((permission) =>
		heldPermissions.has(permission)
	);
	const create = useCreateAccessRole(companyId);
	const submit = useCreateFormSubmit(form, FIELDS, onClose);
	return (
		<CreateFormDialog
			alertRef={submit.alertRef}
			cancelLabel={t(`${key}.cancel`)}
			className="max-w-200"
			description={t(`${key}.description`)}
			formId={formId}
			message={submit.message}
			submitDisabled={!name.trim() && permissions.length === 0}
			submitLabel={t(`${key}.submit`)}
			submitting={isSubmitting}
			title={t(`${key}.title`)}
			onClose={submit.close}
			onSubmit={(event) =>
				handleSubmit((values) =>
					submit.run(
						() =>
							create.mutateAsync({
								name: values.name,
								permissions: values.permissions,
							}),
						(error) => refusalFor(error, values.name, t)
					)
				)(event)
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
				name="permissions"
				render={({ field }) => (
					<PermissionsGrid
						ref={field.ref}
						required
						disabled={isSubmitting}
						error={errors.permissions?.message}
						grantable={heldPermissions}
						legend={t(`${key}.permissions`)}
						value={field.value}
						counter={t(`${key}.permissionsCounter`, {
							count: field.value.length,
						})}
						hint={t(
							holdsEverything
								? `${key}.permissionsHint`
								: `${key}.permissionsHeld`
						)}
						onChange={field.onChange}
					/>
				)}
			/>
		</CreateFormDialog>
	);
};
