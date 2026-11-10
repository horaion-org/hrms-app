import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { RadioCard } from "@/components/forms/RadioCard";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import {
	accessRoleFormSchema,
	roleKindChoices,
	type AccessRoleFormInput,
	type AccessRoleFormValues,
} from "@/features/accessRoles/accessRoleFormSchema";
import { accessRoleRefusal } from "@/features/accessRoles/accessRoleRefusal";
import { isAccessRoleKind } from "@/features/accessRoles/api";
import { PermissionChecklist } from "@/features/accessRoles/PermissionChecklist";
import {
	keysFor,
	permissionList,
	selectionForKind,
} from "@/features/accessRoles/PermissionChecklist/groups";
import type { PermissionKey } from "@/features/workspace/permissionKeys";

export type AccessRoleFormProps = {
	/** A new role, or changes to one: decides the submit label and whether changes are counted. */
	mode: "create" | "edit";
	/**
	 * What the form starts from, and returns to when changes are discarded.
	 * A new role has no kind ("") until the person chooses one.
	 */
	initial: AccessRoleFormInput;
	/** Shows the role without letting it be changed. */
	readOnly?: boolean;
	/** Permissions the person may not grant. */
	unavailable?: ReadonlyArray<PermissionKey>;
	/**
	 * Keys the role holds that this app doesn't know: shown locked, never
	 * part of the values. The caller saves them back untouched.
	 */
	unknown?: ReadonlyArray<string>;
	/** Saves the role. A rejection is explained on its field or above the form. */
	onSubmit: (values: AccessRoleFormValues) => Promise<void>;
	className?: string;
};

const key = "organisation.accessRoles.editor";
const kindKey = "organisation.accessRoles.kind";

/**
 * An access role's name, type and permissions. The type has no default:
 * until it is chosen the permissions can't be changed, and it decides which
 * ones are offered. Switching to a local role clears the
 * company-only permissions and says which. Nothing is saved until the form
 * is submitted, which needs at least one permission, and a type and a name
 * for a new role or a change to an existing one.
 */
export const AccessRoleForm = ({
	mode,
	initial,
	readOnly = false,
	unavailable,
	unknown = [],
	onSubmit,
	className,
}: AccessRoleFormProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const kindId = useId();
	const kindIds = formRowIds(kindId);
	const nameId = useId();
	const nameIds = formRowIds(nameId);
	const {
		register,
		control,
		handleSubmit,
		getValues,
		setValue,
		reset,
		setError,
		setFocus,
		formState: { errors, isDirty, isSubmitting },
	} = useForm<AccessRoleFormInput, unknown, AccessRoleFormValues>({
		resolver: zodResolver(accessRoleFormSchema(t)),
		defaultValues: initial,
	});
	const kind = useWatch({ control, name: "kind" });
	const name = useWatch({ control, name: "name" });
	const permissions = useWatch({ control, name: "permissions" });
	const [message, setMessage] = useState<string>();
	const stickyMarker = useRef<HTMLDivElement>(null);
	const [isStuck, setIsStuck] = useState(false);
	useEffect(() => {
		const marker = stickyMarker.current;
		if (!marker || typeof IntersectionObserver === "undefined") return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry) {
					setIsStuck(
						entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0)
					);
				}
			},
			{ threshold: 1 }
		);
		observer.observe(marker);
		return (): void => {
			observer.disconnect();
		};
	}, []);
	// What the last switch to a local role cleared, named until the type changes again.
	const [cleared, setCleared] = useState<Array<PermissionKey>>([]);
	const added = permissions.filter(
		(item) => !initial.permissions.includes(item)
	).length;
	const removed = initial.permissions.filter(
		(item) => !permissions.includes(item)
	).length;
	const changes = [
		kind !== initial.kind && t(`${key}.typeChanged`),
		added > 0 && t(`${key}.added`, { count: added }),
		removed > 0 && t(`${key}.removed`, { count: removed }),
	]
		.filter(Boolean)
		.join(", ");
	const ready =
		permissions.length + unknown.length > 0 &&
		(mode === "create" ? kind !== "" && name.trim() !== "" : isDirty);
	const kindError = errors.kind?.message;
	const submit = async (values: AccessRoleFormValues): Promise<void> => {
		setMessage(undefined);
		try {
			await onSubmit(values);
		} catch (error) {
			const refusal = accessRoleRefusal(error, values, t);
			if (refusal.kind) {
				setError("kind", { type: "server", message: refusal.kind });
				setFocus("kind");
			}
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
			<div ref={stickyMarker} aria-hidden="true" className="-mb-px h-px" />
			<div
				className="sticky top-0 z-20 flex flex-wrap items-start justify-between gap-6 bg-white py-4 data-stuck:shadow-[0_6px_6px_-6px_rgb(0_0_0/0.2)]"
				data-stuck={isStuck || undefined}
			>
				<FormRow
					className="min-w-0 grow basis-full lg:basis-0"
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
				{!readOnly && (
					<div className="ml-auto flex flex-wrap items-center justify-end gap-3">
						<Button
							disabled={!isDirty || isSubmitting}
							variant="secondary"
							onClick={() => {
								setMessage(undefined);
								setCleared([]);
								reset();
							}}
						>
							{t(`${key}.discard`)}
						</Button>
						<Button disabled={!ready} loading={isSubmitting} type="submit">
							{t(mode === "edit" ? `${key}.save` : `${key}.create`)}
						</Button>
						<p
							aria-live="polite"
							className="w-full text-right text-sm text-neutral-700"
						>
							{permissions.length + unknown.length === 0
								? t(`${key}.permissionsRequired`)
								: mode === "edit" && changes}
						</p>
					</div>
				)}
			</div>
			<FormRow
				className="mt-6 max-w-3xl"
				error={kindError}
				htmlFor={kindId}
				label={t(`${kindKey}.label`)}
				layout="stacked"
				required={!readOnly}
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
							className="grid gap-3 sm:grid-cols-2"
							id={kindId}
							role="radiogroup"
							tabIndex={-1}
						>
							{roleKindChoices(t).map((choice) => (
								<RadioCard
									key={choice.value}
									checked={field.value === choice.value}
									description={choice.description}
									disabled={readOnly || isSubmitting}
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
			<div aria-live="polite" className="max-w-3xl">
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
			<div className="mt-10 flex items-baseline justify-between gap-4">
				<h2 className="text-xl font-medium text-neutral-900">
					{t(`${key}.permissions`)}
				</h2>
				<p className="text-sm text-neutral-700">
					{t(`${key}.selected`, {
						count: permissions.length,
						total: keysFor(kind || undefined).length,
					})}
				</p>
			</div>
			<Callout className="mt-4">
				{t("organisation.accessRoles.baseline")}
			</Callout>
			{!kind && (
				<p className="mt-2 text-sm text-neutral-700">
					{t(`${kindKey}.choose`)}
				</p>
			)}
			<Controller
				control={control}
				name="permissions"
				render={({ field }) => (
					<PermissionChecklist
						className="mt-4"
						disabled={readOnly || isSubmitting || !kind}
						kind={kind || undefined}
						label={t(`${key}.permissions`)}
						unavailable={unavailable}
						unknown={unknown}
						value={field.value}
						onChange={field.onChange}
					/>
				)}
			/>
		</form>
	);
};
