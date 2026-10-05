import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/ui/Button";
import {
	accessRoleFormSchema,
	type AccessRoleFormValues,
} from "@/features/organisation/accessRoleFormSchema";
import { accessRoleRefusal } from "@/features/organisation/accessRoleRefusal";
import { PermissionChecklist } from "@/features/organisation/PermissionChecklist";
import {
	PERMISSION_KEYS,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";

export type AccessRoleFormProps = {
	/** A new role, or changes to one: decides the submit label and whether changes are counted. */
	mode: "create" | "edit";
	/** What the form starts from, and returns to when changes are discarded. */
	initial: AccessRoleFormValues;
	/** Shows the role without letting it be changed. */
	readOnly?: boolean;
	/** Permissions the person may not grant. */
	unavailable?: ReadonlyArray<PermissionKey>;
	/** Saves the role. A rejection is explained on the name field or above the form. */
	onSubmit: (values: AccessRoleFormValues) => Promise<void>;
	className?: string;
};

const key = "organisation.accessRoles.editor";

/**
 * An access role's name and permissions. Nothing is saved until the form is
 * submitted, which needs at least one permission, and a name for a new role
 * or a change to an existing one.
 */
export const AccessRoleForm = ({
	mode,
	initial,
	readOnly = false,
	unavailable,
	onSubmit,
	className,
}: AccessRoleFormProps): FunctionComponent => {
	const { t } = useTranslation();
	const nameId = useId();
	const nameIds = formRowIds(nameId);
	const {
		register,
		control,
		handleSubmit,
		reset,
		setError,
		setFocus,
		formState: { errors, isDirty, isSubmitting },
	} = useForm<AccessRoleFormValues>({
		resolver: zodResolver(accessRoleFormSchema(t)),
		defaultValues: initial,
	});
	const name = useWatch({ control, name: "name" });
	const permissions = useWatch({ control, name: "permissions" });
	const [message, setMessage] = useState<string>();
	const added = permissions.filter(
		(item) => !initial.permissions.includes(item)
	).length;
	const removed = initial.permissions.filter(
		(item) => !permissions.includes(item)
	).length;
	const changes = [
		added > 0 && t(`${key}.added`, { count: added }),
		removed > 0 && t(`${key}.removed`, { count: removed }),
	]
		.filter(Boolean)
		.join(", ");
	const ready =
		permissions.length > 0 &&
		(mode === "create" ? name.trim() !== "" : isDirty);
	const submit = async (values: AccessRoleFormValues): Promise<void> => {
		setMessage(undefined);
		try {
			await onSubmit(values);
		} catch (error) {
			const refusal = accessRoleRefusal(error, values.name, t);
			if (refusal.name) {
				setError("name", { type: "server", message: refusal.name });
				setFocus("name");
			}
			setMessage(refusal.message);
		}
	};

	return (
		<form
			noValidate
			aria-busy={isSubmitting}
			className={className}
			onSubmit={(event) => handleSubmit(submit)(event)}
		>
			{message && (
				<p className="mb-6 text-sm text-error-700" role="alert">
					{message}
				</p>
			)}
			<FormRow
				className="max-w-97.5"
				counter={t(`${key}.nameCounter`, { count: name.length })}
				error={errors.name?.message}
				hint={t(`${key}.nameHint`)}
				htmlFor={nameId}
				label={t(`${key}.name`)}
				layout="stacked"
				required={!readOnly}
			>
				<Input
					aria-describedby={errors.name ? nameIds.errorId : nameIds.hintId}
					aria-invalid={Boolean(errors.name)}
					className="w-full"
					disabled={readOnly || isSubmitting}
					id={nameId}
					maxLength={100}
					required={!readOnly}
					status={errors.name ? "error" : undefined}
					{...register("name")}
				/>
			</FormRow>
			<div className="mt-10 flex items-baseline justify-between gap-4">
				<h2 className="text-xl font-medium text-neutral-900">
					{t(`${key}.permissions`)}
				</h2>
				<p className="text-sm text-neutral-700">
					{t(`${key}.selected`, {
						count: permissions.length,
						total: PERMISSION_KEYS.length,
					})}
				</p>
			</div>
			<Controller
				control={control}
				name="permissions"
				render={({ field }) => (
					<PermissionChecklist
						className="mt-4"
						disabled={readOnly || isSubmitting}
						label={t(`${key}.permissions`)}
						unavailable={unavailable}
						value={field.value}
						onChange={field.onChange}
					/>
				)}
			/>
			{!readOnly && (
				<div className="mt-8 flex flex-wrap items-center justify-end gap-3">
					<p aria-live="polite" className="mr-auto text-sm text-neutral-700">
						{permissions.length === 0
							? t(`${key}.permissionsRequired`)
							: mode === "edit" && changes}
					</p>
					<Button
						disabled={!isDirty || isSubmitting}
						variant="secondary"
						onClick={() => {
							setMessage(undefined);
							reset();
						}}
					>
						{t(`${key}.discard`)}
					</Button>
					<Button disabled={!ready} loading={isSubmitting} type="submit">
						{t(mode === "edit" ? `${key}.save` : `${key}.create`)}
					</Button>
				</div>
			)}
		</form>
	);
};
