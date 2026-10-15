import { countryCodes, countryName } from "@/common/countries";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Combobox } from "@/components/forms/Combobox";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useCompanyMemberSearch } from "@/features/organisation/useCompanyMemberSearch";
import { useCreateBranch } from "@/features/organisation/useCreateBranch";
import { refusalFor } from "@/features/organisation/CreateBranchDialog/refusalFor";
import {
	createBranchSchema,
	type CreateBranchValues,
} from "@/features/organisation/CreateBranchDialog/schema";

export type CreateBranchDialogProps = {
	companyId: string;
	onClose: () => void;
};

/** Mount when opened and unmount when closed so every attempt starts fresh. */
export const CreateBranchDialog = ({
	companyId,
	onClose,
}: CreateBranchDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const key = "organisation.branches.createDialog";
	const formId = useId();
	const nameId = `${formId}-name`,
		codeId = `${formId}-code`,
		cityId = `${formId}-city`,
		countryId = `${formId}-country`,
		headsId = `${formId}-heads`;
	const nameIds = formRowIds(nameId),
		codeIds = formRowIds(codeId),
		cityIds = formRowIds(cityId),
		countryIds = formRowIds(countryId),
		headsIds = formRowIds(headsId);
	const schema = useMemo(() => createBranchSchema(t), [t]);
	const {
		register,
		control,
		handleSubmit,
		reset,
		setError,
		setFocus,
		formState: { errors, isSubmitting },
	} = useForm<CreateBranchValues>({
		resolver: zodResolver(schema),
		defaultValues: { name: "", code: "", city: "", country: "", heads: [] },
		mode: "onSubmit",
		reValidateMode: "onChange",
		shouldFocusError: false,
	});
	const name = useWatch({ control, name: "name" });
	const code = useWatch({ control, name: "code" });
	const city = useWatch({ control, name: "city" });
	const country = useWatch({ control, name: "country" });
	const [countryQuery, setCountryQuery] = useState("");
	const countries = useMemo(
		() =>
			countryCodes
				.map((code) => ({ code, name: countryName(code, i18n.language) }))
				.sort((a, b) => a.name.localeCompare(b.name, i18n.language)),
		[i18n.language]
	);
	const heads = useWatch({ control, name: "heads" });
	const [query, setQuery] = useState("");
	const members = useCompanyMemberSearch(companyId, query);
	const create = useCreateBranch(companyId);
	const [message, setMessage] = useState<string>();
	const refusedField = useRef<
		"name" | "code" | "city" | "country" | "heads" | null
	>(null);
	const alert = useRef<HTMLParagraphElement>(null);
	const inFlight = useRef(false);
	useEffect(() => {
		if (isSubmitting) return;
		if (refusedField.current) {
			setFocus(refusedField.current);
			refusedField.current = null;
		} else if (message) alert.current?.focus();
	}, [isSubmitting, message, setFocus]);
	const close = (): void => {
		if (inFlight.current) return;
		reset();
		onClose();
	};
	const release = (): void => {
		inFlight.current = false;
	};
	const submit = async (values: CreateBranchValues): Promise<void> => {
		if (inFlight.current) return;
		inFlight.current = true;
		setMessage(undefined);
		try {
			await create.mutateAsync({
				name: values.name,
				code: values.code,
				city: values.city,
				country: values.country,
				initialHeadCompanyMembershipIds: values.heads.map(
					(head) => head.membershipId
				),
			});
			reset();
			onClose();
		} catch (error) {
			const refusal = refusalFor(error, values, t);
			if (refusal.fields.code)
				setError("code", { type: "server", message: refusal.fields.code });
			if (refusal.fields.name)
				setError("name", { type: "server", message: refusal.fields.name });
			if (refusal.fields.city)
				setError("city", { type: "server", message: refusal.fields.city });
			if (refusal.fields.country)
				setError("country", {
					type: "server",
					message: refusal.fields.country,
				});
			if (refusal.fields.heads)
				setError("heads", {
					type: "server",
					message: refusal.fields.heads,
				});
			refusedField.current = refusal.fields.name
				? "name"
				: refusal.fields.code
					? "code"
					: refusal.fields.city
						? "city"
						: refusal.fields.country
							? "country"
							: refusal.fields.heads
								? "heads"
								: null;
			setMessage(refusal.message);
			if (refusal.refreshMembers) void members.refetch();
		} finally {
			release();
		}
	};
	return (
		<Dialog
			open
			description={t(`${key}.description`)}
			preventClose={isSubmitting}
			title={t(`${key}.title`)}
			footer={
				<div className="flex justify-end gap-3">
					<Button disabled={isSubmitting} variant="secondary" onClick={close}>
						{t(`${key}.cancel`)}
					</Button>
					<Button
						form={formId}
						loading={isSubmitting}
						type="submit"
						disabled={
							!name.trim() &&
							!code.trim() &&
							!city.trim() &&
							!country &&
							heads.length === 0
						}
					>
						{t(`${key}.submit`)}
					</Button>
				</div>
			}
			onClose={close}
		>
			<form
				noValidate
				aria-busy={isSubmitting}
				className="space-y-6"
				id={formId}
				onSubmit={(event) =>
					handleSubmit(submit, (invalid) => {
						const first = (
							["name", "code", "city", "country", "heads"] as const
						).find((field) => invalid[field]);
						if (first) setFocus(first);
					})(event)
				}
			>
				{message && (
					<p
						ref={alert}
						className="text-sm text-error-700"
						role="alert"
						tabIndex={-1}
					>
						{message}
					</p>
				)}
				<FormRow
					required
					counter={t(`${key}.nameCounter`, { count: name.length })}
					error={errors.name?.message}
					hint={t(`${key}.nameHint`)}
					htmlFor={nameId}
					label={t(`${key}.name`)}
					layout="stacked"
				>
					<Input
						data-autofocus
						required
						aria-describedby={errors.name ? nameIds.errorId : nameIds.hintId}
						aria-invalid={Boolean(errors.name)}
						aria-label={t(`${key}.name`)}
						className="w-full"
						disabled={isSubmitting}
						id={nameId}
						maxLength={100}
						placeholder={t(`${key}.namePlaceholder`)}
						status={errors.name ? "error" : undefined}
						{...register("name")}
					/>
				</FormRow>
				<FormRow
					required
					counter={t(`${key}.codeCounter`, { count: code.length })}
					error={errors.code?.message}
					hint={t(`${key}.codeHint`)}
					htmlFor={codeId}
					label={t(`${key}.code`)}
					layout="stacked"
				>
					<Controller
						control={control}
						name="code"
						render={({ field }) => (
							<Input
								{...field}
								required
								aria-invalid={Boolean(errors.code)}
								aria-label={t(`${key}.code`)}
								className="w-full"
								disabled={isSubmitting}
								id={codeId}
								placeholder={t(`${key}.codePlaceholder`)}
								status={errors.code ? "error" : undefined}
								aria-describedby={
									errors.code ? codeIds.errorId : codeIds.hintId
								}
								onChange={(event) => {
									field.onChange(event.target.value.toUpperCase());
								}}
							/>
						)}
					/>
				</FormRow>
				<FormRow
					required
					counter={t(`${key}.cityCounter`, { count: [...city].length })}
					error={errors.city?.message}
					hint={t(`${key}.cityHint`)}
					htmlFor={cityId}
					label={t(`${key}.city`)}
					layout="stacked"
				>
					<Input
						required
						aria-describedby={errors.city ? cityIds.errorId : cityIds.hintId}
						aria-invalid={Boolean(errors.city)}
						aria-label={t(`${key}.city`)}
						className="w-full"
						disabled={isSubmitting}
						id={cityId}
						placeholder={t(`${key}.cityPlaceholder`)}
						status={errors.city ? "error" : undefined}
						{...register("city")}
					/>
				</FormRow>
				<FormRow
					required
					error={errors.country?.message}
					htmlFor={countryId}
					label={t(`${key}.country`)}
					layout="stacked"
				>
					<Controller
						control={control}
						name="country"
						render={({ field }) => (
							<Combobox
								ref={field.ref}
								aria-required
								virtual
								aria-invalid={Boolean(errors.country)}
								aria-label={t(`${key}.country`)}
								disabled={isSubmitting}
								emptyText={t(`${key}.countryEmpty`)}
								getKey={(option) => option.code}
								getLabel={(option) => option.name}
								id={countryId}
								multiple={false}
								placeholder={t(`${key}.countryPlaceholder`)}
								query={countryQuery}
								searchPlaceholder={t(`${key}.countrySearch`)}
								status={errors.country ? "error" : undefined}
								aria-describedby={
									errors.country ? countryIds.errorId : undefined
								}
								options={countries.filter((option) =>
									option.name
										.toLocaleLowerCase(i18n.language)
										.includes(
											countryQuery.trim().toLocaleLowerCase(i18n.language)
										)
								)}
								value={
									countries.find((option) => option.code === field.value) ??
									null
								}
								onQueryChange={setCountryQuery}
								onChange={(option) => {
									field.onChange(option?.code ?? "");
								}}
							/>
						)}
					/>
				</FormRow>
				<FormRow
					required
					counter={t(`${key}.headsCounter`, { count: heads.length })}
					error={errors.heads?.message}
					hint={t(`${key}.headsHint`)}
					htmlFor={headsId}
					label={t(`${key}.heads`)}
					layout="stacked"
				>
					<Controller
						control={control}
						name="heads"
						render={({ field }) => (
							<Combobox
								ref={field.ref}
								aria-required
								aria-invalid={Boolean(errors.heads)}
								aria-label={t(`${key}.heads`)}
								disabled={isSubmitting}
								getKey={(member) => member.membershipId}
								getLabel={(member) => member.displayName}
								id={headsId}
								loading={members.isFetching}
								loadingText={t(`${key}.loading`)}
								maxSelected={20}
								options={members.data?.items ?? []}
								placeholder={t(`${key}.headsPlaceholder`)}
								query={query}
								searchPlaceholder={t(`${key}.searchPlaceholder`)}
								status={errors.heads ? "error" : undefined}
								value={field.value}
								aria-describedby={
									errors.heads ? headsIds.errorId : headsIds.hintId
								}
								emptyText={t(
									members.isError ? `${key}.membersFailed` : `${key}.noResults`
								)}
								footer={
									members.data &&
									t(
										members.data.total > 20
											? `${key}.membersTruncated`
											: `${key}.membersFooter`,
										{ total: members.data.total }
									)
								}
								renderOption={(member) => (
									<span className="flex items-center gap-3">
										<Avatar
											className="size-9 text-sm"
											name={member.displayName}
										/>
										<span className="min-w-0 flex-1 truncate">
											{member.displayName}
										</span>
										<Badge className="normal-case" tone="success">
											{t(`${key}.active`)}
										</Badge>
									</span>
								)}
								onChange={field.onChange}
								onQueryChange={setQuery}
							/>
						)}
					/>
				</FormRow>
			</form>
		</Dialog>
	);
};
