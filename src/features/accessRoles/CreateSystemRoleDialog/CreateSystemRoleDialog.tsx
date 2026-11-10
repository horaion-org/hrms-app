import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { RadioCard } from "@/components/forms/RadioCard";
import { roleKindChoices } from "@/features/accessRoles/accessRoleFormSchema";
import { isAccessRoleKind } from "@/features/organisation/api";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { refusalFor } from "@/features/accessRoles/CreateSystemRoleDialog/refusalFor";
import {
	createSystemRoleSchema,
	type CreateSystemRoleInput,
	type CreateSystemRoleValues,
} from "@/features/accessRoles/CreateSystemRoleDialog/schema";
import { PermissionChecklist } from "@/features/accessRoles/PermissionChecklist";
import {
	ROLE_TEMPLATE_LIST,
	type RoleTemplateKey,
	startFrom,
	templatePlaces,
} from "@/features/accessRoles/roleTemplates";
import {
	permissionList,
	selectionForKind,
} from "@/features/accessRoles/PermissionChecklist/groups";
import { UnitNameField } from "@/features/organisation/UnitNameField";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import { useCreateAccessRole } from "@/features/accessRoles/useCreateAccessRole";
import {
	PERMISSION_KEYS,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";

export type CreateSystemRoleDialogProps = {
	companyId: string;
	/**
	 * The permissions the person holds company-wide. Only these can be granted
	 * (the API's subset rule), so every other box is disabled.
	 */
	heldPermissions: ReadonlySet<string>;
	/** What the form starts from when duplicating a role, its kind included; empty otherwise. */
	initial?: CreateSystemRoleInput;
	onClose: () => void;
};

const FIELDS = ["kind", "name", "permissions"] as const;
const EMPTY: CreateSystemRoleInput = { kind: "", name: "", permissions: [] };

const SCRATCH = "scratch";

/**
 * A new role's starting point, type, name and permissions. A fresh role can
 * start from a template, which fills in its type, a name and the template's
 * permissions the person can give, naming how many were left out; the
 * result is an ordinary role, never linked to the template. The type has no
 * default: until it is chosen the permissions can't be changed, and it
 * decides which ones are offered. Switching to a local role clears the
 * company-only permissions and says which. Mount when opened and unmount
 * when closed so every attempt starts fresh.
 */
export const CreateSystemRoleDialog = ({
	companyId,
	heldPermissions,
	initial = EMPTY,
	onClose,
}: CreateSystemRoleDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const key = "organisation.accessRoles.createDialog";
	const kindKey = "organisation.accessRoles.kind";
	const formId = useId();
	const schema = useMemo(() => createSystemRoleSchema(t), [t]);
	const form = useForm<CreateSystemRoleInput, unknown, CreateSystemRoleValues>({
		resolver: zodResolver(schema),
		defaultValues: initial,
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const {
		register,
		control,
		handleSubmit,
		getValues,
		setValue,
		reset,
		formState: { errors, isSubmitting },
	} = form;
	const [kind, name, permissions] = useWatch({
		control,
		name: ["kind", "name", "permissions"],
	});
	// What the last switch to a local role cleared, named until the type changes again.
	const [cleared, setCleared] = useState<Array<PermissionKey>>([]);
	// The template the role started from, and how many of its keys the person couldn't give.
	const [template, setTemplate] = useState<RoleTemplateKey | typeof SCRATCH>(
		SCRATCH
	);
	const [leftOut, setLeftOut] = useState(0);
	const offersTemplates = initial === EMPTY;
	const templatesKey = "organisation.accessRoles.templates";
	const language = i18n.resolvedLanguage ?? i18n.language;
	const unavailable = PERMISSION_KEYS.filter(
		(permission) => !heldPermissions.has(permission)
	);
	const kindId = `${formId}-kind`;
	const kindIds = formRowIds(kindId);
	const kindError = errors.kind?.message;
	const permissionsId = `${formId}-permissions`;
	const permissionsIds = formRowIds(permissionsId);
	const permissionsHint = kind
		? t(
				unavailable.length === 0
					? `${key}.permissionsHint`
					: `${key}.permissionsHeld`
			)
		: t(`${kindKey}.choose`);
	const chooseTemplate = (next: string): void => {
		const chosen = ROLE_TEMPLATE_LIST.find((each) => each.key === next);
		setCleared([]);
		if (!chosen) {
			setTemplate(SCRATCH);
			setLeftOut(0);
			reset(EMPTY);
			return;
		}
		const start = startFrom(chosen, unavailable);
		setTemplate(chosen.key);
		setLeftOut(start.leftOut.length);
		setValue("kind", start.kind, { shouldDirty: true });
		setValue("permissions", start.permissions, { shouldDirty: true });
		setValue("name", t(`${templatesKey}.${chosen.key}.name`), {
			shouldDirty: true,
		});
	};
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
			submitDisabled={!kind && !name.trim() && permissions.length === 0}
			submitLabel={t(`${key}.submit`)}
			submitting={isSubmitting}
			title={t(`${key}.title`)}
			onClose={submit.close}
			onSubmit={(event) =>
				handleSubmit((values) =>
					submit.run(
						() =>
							create.mutateAsync({
								kind: values.kind,
								name: values.name,
								permissions: values.permissions,
							}),
						(error) => refusalFor(error, values, t)
					)
				)(event)
			}
		>
			{offersTemplates && (
				<fieldset>
					<legend
						className="text-sm text-neutral-800"
						id={`${formId}-template-label`}
					>
						{t(`${templatesKey}.label`)}
					</legend>
					<p className="mt-1 text-sm text-neutral-700">
						{t(`${templatesKey}.copyNote`)}
					</p>
					<div
						aria-labelledby={`${formId}-template-label`}
						className="mt-3 grid gap-3 sm:grid-cols-2"
						role="radiogroup"
					>
						{ROLE_TEMPLATE_LIST.map((each) => {
							const start = startFrom(each, unavailable);
							return (
								<RadioCard
									key={each.key}
									checked={template === each.key}
									disabled={isSubmitting}
									label={t(`${templatesKey}.${each.key}.name`)}
									name={`${formId}-template`}
									value={each.key}
									description={[
										t(`${templatesKey}.${each.key}.description`),
										t(`${templatesKey}.where`, {
											places: templatePlaces(each, t, language),
										}),
										start.leftOut.length > 0 &&
											t(`${templatesKey}.shortfall`, {
												count: start.leftOut.length,
											}),
									]
										.filter(Boolean)
										.join(" ")}
									onChange={chooseTemplate}
								/>
							);
						})}
						<RadioCard
							checked={template === SCRATCH}
							description={t(`${templatesKey}.scratch.description`)}
							disabled={isSubmitting}
							label={t(`${templatesKey}.scratch.name`)}
							name={`${formId}-template`}
							value={SCRATCH}
							onChange={chooseTemplate}
						/>
					</div>
					<div aria-live="polite">
						{leftOut > 0 && (
							<p className="mt-2 text-sm text-neutral-700">
								{t(`${templatesKey}.leftOut`, { count: leftOut })}
							</p>
						)}
					</div>
				</fieldset>
			)}
			<div>
				<FormRow
					required
					error={kindError}
					htmlFor={kindId}
					label={t(`${kindKey}.label`)}
					layout="stacked"
				>
					<Controller
						control={control}
						name="kind"
						render={({ field }) => (
							// The group takes focus when a refusal points at the field; the cards hold no ref.
							<div
								ref={field.ref}
								aria-describedby={kindError ? kindIds.errorId : undefined}
								aria-invalid={Boolean(kindError)}
								aria-labelledby={kindIds.labelId}
								className="grid gap-3"
								id={kindId}
								role="radiogroup"
								tabIndex={-1}
							>
								{roleKindChoices(t).map((choice) => (
									<RadioCard
										key={choice.value}
										checked={field.value === choice.value}
										description={choice.description}
										disabled={isSubmitting}
										label={choice.label}
										name={field.name}
										value={choice.value}
										onChange={(next) => {
											if (!isAccessRoleKind(next)) return;
											field.onChange(next);
											const switched = selectionForKind(
												getValues("permissions"),
												next
											);
											if (switched.removed.length > 0)
												setValue("permissions", switched.selected, {
													shouldDirty: true,
												});
											setCleared(switched.removed);
										}}
									/>
								))}
							</div>
						)}
					/>
				</FormRow>
				<div aria-live="polite">
					{cleared.length > 0 && (
						<p className="mt-2 text-sm text-neutral-700">
							{t(`${kindKey}.removed`, {
								count: cleared.length,
								permissions: permissionList(
									cleared,
									t,
									i18n.resolvedLanguage ?? i18n.language
								),
							})}
						</p>
					)}
				</div>
			</div>
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
					<FormRow
						required
						error={errors.permissions?.message}
						hint={permissionsHint}
						htmlFor={permissionsId}
						label={t(`${key}.permissions`)}
						layout="stacked"
						counter={t(`${key}.permissionsCounter`, {
							count: field.value.length,
						})}
					>
						<PermissionChecklist
							ref={field.ref}
							disabled={isSubmitting || !kind}
							id={permissionsId}
							kind={kind || undefined}
							label={t(`${key}.permissions`)}
							unavailable={unavailable}
							value={field.value}
							describedBy={
								errors.permissions
									? permissionsIds.errorId
									: permissionsIds.hintId
							}
							onChange={field.onChange}
						/>
					</FormRow>
				)}
			/>
		</CreateFormDialog>
	);
};
