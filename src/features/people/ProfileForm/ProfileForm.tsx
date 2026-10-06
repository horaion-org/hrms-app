import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useId, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { todayDate } from "@/components/forms/Calendar";
import { Combobox } from "@/components/forms/Combobox";
import { DatePicker } from "@/components/forms/DatePicker";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { PhoneInput } from "@/components/forms/PhoneInput";
import { Select, type SelectOption } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
	CrossIcon,
	OrganisationIcon,
	PhoneIcon,
	RoleIcon,
	TickIcon,
	UserIcon,
} from "@/components/ui/Icon";
import {
	departmentChoices,
	type DepartmentChoice,
} from "@/features/organisation/departmentChoices";
import { HeadsField } from "@/features/organisation/HeadsField";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import {
	useAccessRoles,
	useBranches,
	useDepartments,
	useJobTitles,
} from "@/features/organisation/useOrganisationList";
import {
	EMPLOYMENT_TYPES,
	isEmploymentType,
	type MemberProfilePlace,
} from "@/features/people/api";
import {
	profileFormSchema,
	type ProfileFormValues,
} from "@/features/people/profileFormSchema";
import {
	PROFILE_FIELDS,
	profileRefusal,
} from "@/features/people/profileRefusal";
import { useCan } from "@/features/workspace/useCan";

export type ProfileFormProps = {
	companyId: string;
	/** The page's heading and the line under it. */
	title: string;
	description: string;
	/** What the form starts from. */
	initial: ProfileFormValues;
	/**
	 * Saves the profile in the chosen Department. A rejection is explained on
	 * its field or above the cards; anything after a save, such as leaving the
	 * page, is the caller's.
	 */
	onSubmit: (
		values: ProfileFormValues,
		place: MemberProfilePlace
	) => Promise<void>;
	/** Leaves without saving. */
	onCancel: () => void;
	className?: string;
};

const key = "people.form";
const BY_NAME = { sort: { field: "name", desc: false } } as const;
const ACTIVE_BY_NAME = { ...BY_NAME, status: "ACTIVE" } as const;
const NOTHING = (): void => {};

/**
 * A person's profile in four cards: personal, contact, employment, and their
 * Department and role. Only Departments where the person may add employees
 * are offered. The manager and system role appear only for those who may
 * search people, and read and assign roles.
 */
export const ProfileForm = ({
	companyId,
	title,
	description,
	initial,
	onSubmit,
	onCancel,
	className,
}: ProfileFormProps): FunctionComponent => {
	const { t } = useTranslation();
	const can = useCan();
	const client = useQueryClient();
	const formId = useId();
	const [today] = useState(() => todayDate(Date.now()));
	const schema = useMemo(() => profileFormSchema(t, today), [t, today]);
	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(schema),
		defaultValues: initial,
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const {
		register,
		control,
		handleSubmit,
		setValue,
		setError,
		setFocus,
		formState: { errors, isSubmitting },
	} = form;
	const { message, alertRef, run } = useCreateFormSubmit(
		form,
		PROFILE_FIELDS,
		NOTHING
	);
	const [departmentId, hireDate] = useWatch({
		control,
		name: ["departmentId", "hireDate"],
	});
	const [departmentQuery, setDepartmentQuery] = useState("");

	const branches = useBranches(companyId, ACTIVE_BY_NAME);
	const departments = useDepartments(companyId, ACTIVE_BY_NAME);
	const choices: Array<DepartmentChoice> =
		branches.status === "ready" && departments.status === "ready"
			? departmentChoices(
					branches.items,
					departments.items,
					(id) => can("member_profile:create", id),
					t
				)
			: [];
	const chosen = choices.find(
		(choice) => choice.department.departmentId === departmentId
	);
	const jobTitles = useJobTitles(
		companyId,
		{ ...ACTIVE_BY_NAME, departmentId },
		departmentId !== ""
	);
	// The previous Department's titles stay on screen while the next ones load.
	const jobTitleOptions: Array<SelectOption> =
		jobTitles.status === "ready"
			? jobTitles.items
					.filter((jobTitle) => jobTitle.departmentId === departmentId)
					.map((jobTitle) => ({
						value: jobTitle.jobTitleId,
						label: jobTitle.name,
					}))
			: [];
	const showManager = can("company_member:read");
	// The same keys the System roles page asks for before offering to assign.
	const showRole = can("access_role:read") && can("access_role:assign");
	const roles = useAccessRoles(companyId, BY_NAME);
	// The Company Owner role moves only through its own transfer.
	const roleOptions: Array<SelectOption> =
		roles.status === "ready"
			? roles.items
					.filter((role) => role.status === "ACTIVE" && !role.protectedRole)
					.map((role) => ({ value: role.accessRoleId, label: role.name }))
			: [];
	const departmentHint =
		branches.status === "pending" || departments.status === "pending"
			? t(`${key}.departmentsLoading`)
			: branches.status !== "ready" || departments.status !== "ready"
				? t(`${key}.departmentsFailed`)
				: choices.length === 0
					? t(`${key}.departmentsEmpty`)
					: undefined;
	const jobTitleHint =
		departmentId === ""
			? t(`${key}.jobTitleNeedsDepartment`)
			: jobTitles.status === "pending"
				? t(`${key}.jobTitlesLoading`)
				: jobTitles.status !== "ready"
					? t(`${key}.jobTitlesFailed`)
					: jobTitleOptions.length === 0
						? t(`${key}.jobTitlesEmpty`)
						: undefined;

	/** An optional choice can be taken back once made. */
	const withNone = (
		options: Array<SelectOption>,
		value: string
	): Array<SelectOption> =>
		value ? [{ value: "", label: t(`${key}.none`) }, ...options] : options;
	const idOf = (name: string): string => `${formId}-${name}`;
	/** A row's error, else its hint, else nothing. */
	const describedBy = (
		name: string,
		error: unknown,
		hint?: unknown
	): string | undefined =>
		error
			? formRowIds(idOf(name)).errorId
			: hint
				? formRowIds(idOf(name)).hintId
				: undefined;
	const date = (
		name: "dateOfBirth" | "hireDate" | "probationEndDate",
		label: string,
		limits: { minDate?: string; maxDate?: string }
	): FunctionComponent => {
		const error = errors[name]?.message;
		return (
			<FormRow error={error} htmlFor={idOf(name)} label={label}>
				<Controller
					control={control}
					name={name}
					render={({ field }) => (
						<DatePicker
							ref={field.ref}
							clearable
							aria-describedby={describedBy(name, error)}
							aria-invalid={Boolean(error)}
							aria-labelledby={formRowIds(idOf(name)).labelId}
							className="w-full"
							disabled={isSubmitting}
							id={idOf(name)}
							label={label}
							mode="single"
							name={field.name}
							placeholder={t(`${key}.datePlaceholder`)}
							status={error ? "error" : undefined}
							value={field.value}
							onBlur={field.onBlur}
							onChange={field.onChange}
							{...limits}
						/>
					)}
				/>
			</FormRow>
		);
	};
	const nameError = errors.displayName?.message;
	const phoneError = errors.phone?.message;
	const emailError = errors.email?.message;
	const typeError = errors.employmentType?.message;
	const jobTitleError = errors.jobTitleId?.message;
	const departmentError = errors.departmentId?.message;
	const roleError = errors.accessRoleId?.message;

	return (
		<form
			noValidate
			aria-busy={isSubmitting}
			className={className}
			onSubmit={(event) =>
				handleSubmit(async (values) => {
					if (!chosen) {
						setError("departmentId", {
							type: "server",
							message: t(`${key}.departmentUnavailable`),
						});
						setFocus("departmentId");
						return;
					}
					const refusal = await run(
						() =>
							onSubmit(values, {
								branchId: chosen.department.branchId,
								departmentId: chosen.department.departmentId,
							}),
						(error) => profileRefusal(error, t)
					);
					if (refusal?.fields.departmentId)
						void client.invalidateQueries({
							queryKey: ["organisation", companyId, "departments"],
						});
					if (refusal?.fields.jobTitleId)
						void client.invalidateQueries({
							queryKey: ["organisation", companyId, "job-titles"],
						});
					if (refusal?.refreshMembers)
						void client.invalidateQueries({
							queryKey: ["organisation", companyId, "members"],
						});
				})(event)
			}
		>
			<div className="flex flex-wrap items-start justify-between gap-6">
				<div>
					<h1 className="text-4xl font-medium text-neutral-900">{title}</h1>
					<p className="mt-4 text-sm text-neutral-800">{description}</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button
						disabled={isSubmitting}
						leadingIcon={<CrossIcon />}
						variant="secondary"
						onClick={onCancel}
					>
						{t("organisation.list.cancel")}
					</Button>
					<Button
						leadingIcon={<TickIcon />}
						loading={isSubmitting}
						type="submit"
					>
						{t(`${key}.confirm`)}
					</Button>
				</div>
			</div>
			{message && (
				<p
					ref={alertRef}
					className="mt-6 text-sm text-error-700"
					role="alert"
					tabIndex={-1}
				>
					{message}
				</p>
			)}
			<div className="mt-10 grid gap-6 xl:grid-cols-2">
				<Card icon={UserIcon} title={t(`${key}.personal`)}>
					<div className="flex flex-col gap-4">
						<FormRow
							required
							error={nameError}
							htmlFor={idOf("displayName")}
							label={t(`${key}.fullName`)}
						>
							<Input
								required
								aria-describedby={describedBy("displayName", nameError)}
								aria-invalid={Boolean(nameError)}
								autoComplete="off"
								className="w-full"
								disabled={isSubmitting}
								id={idOf("displayName")}
								maxLength={255}
								placeholder={t(`${key}.fullNamePlaceholder`)}
								status={nameError ? "error" : undefined}
								{...register("displayName")}
							/>
						</FormRow>
						{date("dateOfBirth", t(`${key}.dateOfBirth`), {
							maxDate: dayjs(today).subtract(1, "day").format("YYYY-MM-DD"),
						})}
					</div>
				</Card>
				<Card icon={PhoneIcon} title={t(`${key}.contact`)}>
					<div className="flex flex-col gap-4">
						<FormRow
							error={phoneError}
							htmlFor={idOf("phone")}
							label={t(`${key}.phone`)}
						>
							<Controller
								control={control}
								name="phone"
								render={({ field }) => (
									<PhoneInput
										ref={field.ref}
										aria-describedby={describedBy("phone", phoneError)}
										aria-invalid={Boolean(phoneError)}
										aria-labelledby={formRowIds(idOf("phone")).labelId}
										className="w-full"
										defaultCountry={chosen?.branch?.country}
										disabled={isSubmitting}
										id={idOf("phone")}
										name={field.name}
										placeholder={t(`${key}.phonePlaceholder`)}
										status={phoneError ? "error" : undefined}
										value={field.value}
										onBlur={field.onBlur}
										onChange={field.onChange}
									/>
								)}
							/>
						</FormRow>
						<FormRow
							required
							error={emailError}
							hint={t(`${key}.emailHint`)}
							htmlFor={idOf("email")}
							label={t(`${key}.email`)}
						>
							<Input
								required
								aria-describedby={describedBy("email", emailError, true)}
								aria-invalid={Boolean(emailError)}
								autoComplete="off"
								className="w-full"
								disabled={isSubmitting}
								id={idOf("email")}
								maxLength={320}
								placeholder={t(`${key}.emailPlaceholder`)}
								status={emailError ? "error" : undefined}
								type="email"
								{...register("email")}
							/>
						</FormRow>
					</div>
				</Card>
				<Card icon={RoleIcon} title={t(`${key}.employment`)}>
					<div className="flex flex-col gap-4">
						<FormRow
							error={typeError}
							htmlFor={idOf("employmentType")}
							label={t(`${key}.employmentType`)}
						>
							<Controller
								control={control}
								name="employmentType"
								render={({ field }) => (
									<Select
										ref={field.ref}
										aria-describedby={describedBy("employmentType", typeError)}
										aria-invalid={Boolean(typeError)}
										aria-labelledby={formRowIds(idOf("employmentType")).labelId}
										className="w-full"
										disabled={isSubmitting}
										name={field.name}
										placeholder={t(`${key}.employmentTypePlaceholder`)}
										status={typeError ? "error" : undefined}
										value={field.value}
										options={withNone(
											EMPLOYMENT_TYPES.map((type) => ({
												value: type,
												label: t(`${key}.employmentTypes.${type}`),
											})),
											field.value
										)}
										onChange={(value) => {
											field.onChange(isEmploymentType(value) ? value : "");
										}}
									/>
								)}
							/>
						</FormRow>
						{date("hireDate", t(`${key}.hireDate`), {})}
						{date(
							"probationEndDate",
							t(`${key}.probationEndDate`),
							hireDate ? { minDate: hireDate } : {}
						)}
					</div>
				</Card>
				<Card icon={OrganisationIcon} title={t(`${key}.placement`)}>
					<div className="flex flex-col gap-4">
						<FormRow
							error={jobTitleError}
							hint={jobTitleHint}
							htmlFor={idOf("jobTitleId")}
							label={t(`${key}.jobTitle`)}
						>
							<Controller
								control={control}
								name="jobTitleId"
								render={({ field }) => (
									<Select
										ref={field.ref}
										aria-invalid={Boolean(jobTitleError)}
										aria-labelledby={formRowIds(idOf("jobTitleId")).labelId}
										className="w-full"
										disabled={isSubmitting || departmentId === ""}
										name={field.name}
										options={withNone(jobTitleOptions, field.value)}
										placeholder={t(`${key}.jobTitlePlaceholder`)}
										status={jobTitleError ? "error" : undefined}
										value={field.value}
										aria-describedby={describedBy(
											"jobTitleId",
											jobTitleError,
											jobTitleHint
										)}
										onChange={field.onChange}
									/>
								)}
							/>
						</FormRow>
						<FormRow
							required
							error={departmentError}
							hint={departmentHint}
							htmlFor={idOf("departmentId")}
							label={t(`${key}.department`)}
						>
							<Controller
								control={control}
								name="departmentId"
								render={({ field }) => (
									<Combobox
										ref={field.ref}
										aria-required
										aria-invalid={Boolean(departmentError)}
										aria-labelledby={formRowIds(idOf("departmentId")).labelId}
										className="w-full"
										disabled={isSubmitting || choices.length === 0}
										emptyText={t(`${key}.noDepartmentMatches`)}
										getKey={(choice) => choice.department.departmentId}
										getLabel={(choice) => choice.label}
										id={idOf("departmentId")}
										multiple={false}
										placeholder={t(`${key}.departmentPlaceholder`)}
										query={departmentQuery}
										searchPlaceholder={t(`${key}.searchDepartments`)}
										status={departmentError ? "error" : undefined}
										value={chosen ?? null}
										aria-describedby={describedBy(
											"departmentId",
											departmentError,
											departmentHint
										)}
										options={choices.filter((choice) =>
											choice.label
												.toLocaleLowerCase()
												.includes(departmentQuery.trim().toLocaleLowerCase())
										)}
										onQueryChange={setDepartmentQuery}
										onChange={(choice) => {
											const next = choice?.department.departmentId ?? "";
											if (next === field.value) return;
											field.onChange(next);
											// Job titles belong to one Department.
											setValue("jobTitleId", "");
										}}
									/>
								)}
							/>
						</FormRow>
						{showManager && (
							<Controller
								control={control}
								name="reportsTo"
								render={({ field }) => (
									<HeadsField
										ref={field.ref}
										companyId={companyId}
										disabled={isSubmitting}
										error={errors.reportsTo?.message}
										hint={t(`${key}.managerHint`)}
										id={idOf("reportsTo")}
										label={t(`${key}.manager`)}
										layout="inline"
										multiple={false}
										placeholder={t(`${key}.managerPlaceholder`)}
										required={false}
										value={field.value}
										onChange={field.onChange}
									/>
								)}
							/>
						)}
						{showRole && (
							<FormRow
								error={roleError}
								hint={t(`${key}.systemRoleHint`)}
								htmlFor={idOf("accessRoleId")}
								label={t(`${key}.systemRole`)}
							>
								<Controller
									control={control}
									name="accessRoleId"
									render={({ field }) => (
										<Select
											ref={field.ref}
											aria-invalid={Boolean(roleError)}
											aria-labelledby={formRowIds(idOf("accessRoleId")).labelId}
											className="w-full"
											disabled={isSubmitting}
											name={field.name}
											options={withNone(roleOptions, field.value)}
											placeholder={t(`${key}.systemRolePlaceholder`)}
											status={roleError ? "error" : undefined}
											value={field.value}
											aria-describedby={describedBy(
												"accessRoleId",
												roleError,
												true
											)}
											onChange={field.onChange}
										/>
									)}
								/>
							</FormRow>
						)}
					</div>
				</Card>
			</div>
		</form>
	);
};
