import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useId, useMemo, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { formatDate, todayDate } from "@/components/forms/Calendar";
import { DatePicker } from "@/components/forms/DatePicker";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Callout } from "@/components/ui/Callout";
import {
	activeTermsQuery,
	type EmploymentTerms,
	type HistoryEntry,
	type MemberTerms,
} from "@/features/employmentTerms/api";
import { formatHours } from "@/features/employmentTerms/hours";
import {
	memberTermsBodyOf,
	memberTermsFormSchema,
	memberTermsFormValuesOf,
	allowedStart,
	startRuleOf,
	type MemberTermsFormValues,
} from "@/features/employmentTerms/memberTermsForm";
import { memberTermsRefusal } from "@/features/employmentTerms/refusals";
import { termsSentence } from "@/features/employmentTerms/summary";
import {
	nextMonday,
	partTimeMismatch,
} from "@/features/employmentTerms/termsChanges";
import { useMemberTermsActions } from "@/features/employmentTerms/useMemberTermsActions";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";

export type ChangeEmploymentTermsDialogProps = {
	companyId: string;
	person: {
		membershipId: string;
		displayName: string;
		employmentType: string | null;
		hireDate: string | null;
	};
	/** Their terms and history as loaded. */
	current: MemberTerms;
	/** Set to correct this entry in place instead of adding a change. */
	correcting?: HistoryEntry;
	/** Called with the confirmation to show once saved. */
	onSaved: (message: string) => void;
	onClose: () => void;
};

const FIELDS = ["termsId", "effectiveFrom", "ownWeek", "ownDay"] as const;
const key = "employmentTerms.change";

/** The active terms with this id, if the list has it. */
const findTerms = <T extends { id: string }>(
	list: ReadonlyArray<T> | undefined,
	termsId: string
): T | undefined => list?.find((each) => each.id === termsId);

/**
 * Gives one person terms from a date, or corrects an entry of their
 * history: the terms (active ones), when they start (a Monday, except
 * someone's first terms, which may start on their hire date), and their own
 * hours when they work fewer than the terms say. Says so when the date is
 * past, or when their Employment type and the terms disagree.
 */
export const ChangeEmploymentTermsDialog = ({
	companyId,
	person,
	current,
	correcting,
	onSaved,
	onClose,
}: ChangeEmploymentTermsDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const formId = useId();
	const idOf = (field: string): string => `${formId}-${field}`;
	const [today] = useState(() => todayDate(Date.now()));
	const terms = useQuery(activeTermsQuery(companyId));
	const activeTerms = terms.data?.terms;
	// The figures to read the terms against come with their own reads.
	const reference = current.reference ?? terms.data?.reference;
	const actions = useMemberTermsActions(companyId, person.membershipId);
	const startRule = useMemo(
		() => startRuleOf(current.history, correcting),
		[current.history, correcting]
	);
	const schema = useMemo(
		() =>
			memberTermsFormSchema(t, {
				termsOf: (id): EmploymentTerms | undefined =>
					findTerms(activeTerms, id),
				startRule,
			}),
		[t, activeTerms, startRule]
	);
	const form = useForm<MemberTermsFormValues>({
		resolver: zodResolver(schema),
		defaultValues: memberTermsFormValuesOf(
			correcting ?? {
				termsId:
					current.inForce?.basis === "ASSIGNED" ? current.inForce.termsId : "",
				effectiveFrom:
					startRule.kind === "anyDay"
						? (person.hireDate ?? today)
						: nextMonday(
								startRule.kind === "monday" && startRule.after > today
									? startRule.after
									: today
							),
			}
		),
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const {
		register,
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = form;
	const values = useWatch({ control }) as MemberTermsFormValues;
	const submit = useCreateFormSubmit(form, FIELDS, onClose);
	const chosen = findTerms(activeTerms, values.termsId);
	const own = memberTermsBodyOf(values);
	const mismatch = chosen
		? partTimeMismatch(
				person.employmentType,
				chosen.weekMinutes,
				own.contractedWeekMinutes,
				reference?.partTimeBelowMinutes ?? null
			)
		: undefined;
	const title = correcting
		? t(`${key}.correctTitle`)
		: current.inForce?.basis === "ASSIGNED"
			? t(`${key}.title`)
			: t(`${key}.setTitle`);
	const termsError = errors.termsId?.message;
	const fromError = errors.effectiveFrom?.message;
	const fromHint =
		startRule.kind === "anyDay"
			? t(`${key}.firstHint`)
			: startRule.kind === "first"
				? t(`${key}.firstEntry`)
				: t(`${key}.mondayAfterFirst`, {
						date: formatDate(startRule.after, language),
					});
	// Correcting an entry on terms deactivated since: they stay chosen, marked inactive.
	const termsOptions = [
		...(activeTerms ?? []).map((each) => ({
			value: each.id,
			label: each.name,
		})),
		...(correcting && !findTerms(activeTerms, correcting.termsId)
			? [
					{
						value: correcting.termsId,
						label: t(`${key}.inactiveOption`, { name: correcting.termsName }),
					},
				]
			: []),
	];
	const ownField = (
		field: "ownWeek" | "ownDay",
		label: string,
		hint: string | undefined
	): ReactNode => {
		const error = errors[field]?.message;
		const ids = formRowIds(idOf(field));
		return (
			<FormRow
				error={error}
				hint={hint}
				htmlFor={idOf(field)}
				label={label}
				layout="stacked"
			>
				<Input
					aria-describedby={error ? ids.errorId : hint ? ids.hintId : undefined}
					aria-invalid={Boolean(error)}
					className="w-full"
					disabled={isSubmitting}
					id={idOf(field)}
					inputMode="decimal"
					status={error ? "error" : undefined}
					{...register(field)}
				/>
			</FormRow>
		);
	};
	return (
		<CreateFormDialog
			alertRef={submit.alertRef}
			cancelLabel={t(`${key}.cancel`)}
			formId={formId}
			message={submit.message}
			submitting={isSubmitting}
			title={title}
			description={
				correcting
					? t(`${key}.correctDescription`)
					: t(`${key}.description`, { name: person.displayName })
			}
			submitLabel={
				correcting
					? t(`${key}.submitCorrect`)
					: current.inForce?.basis === "ASSIGNED"
						? t(`${key}.submit`)
						: t(`${key}.submitSet`)
			}
			onClose={submit.close}
			onSubmit={(event) =>
				handleSubmit(async (submitted) => {
					const body = memberTermsBodyOf(submitted);
					await submit.run(
						async () => {
							if (correcting)
								await actions.correct.mutateAsync({
									entryId: correcting.id,
									body,
								});
							else await actions.add.mutateAsync(body);
							onSaved(
								correcting
									? t(`${key}.toast.corrected`)
									: t(`${key}.toast.changed`, {
											date: formatDate(body.effectiveFrom, language),
										})
							);
						},
						(error) => memberTermsRefusal(error, t)
					);
				})(event)
			}
		>
			<FormRow
				htmlFor={idOf("termsId")}
				label={t(`${key}.terms`)}
				layout="stacked"
				error={
					termsError ?? (terms.isError ? t(`${key}.termsFailed`) : undefined)
				}
			>
				<Controller
					control={control}
					name="termsId"
					render={({ field }) => (
						<Select
							ref={field.ref}
							aria-invalid={Boolean(termsError)}
							aria-labelledby={formRowIds(idOf("termsId")).labelId}
							className="w-full"
							disabled={isSubmitting || activeTerms === undefined}
							name={field.name}
							options={termsOptions}
							placeholder={t(`${key}.termsPlaceholder`)}
							status={termsError ? "error" : undefined}
							value={field.value}
							onChange={field.onChange}
						/>
					)}
				/>
			</FormRow>
			{chosen && (
				<p className="text-sm text-neutral-800">
					{termsSentence(chosen, reference, t, language)}
				</p>
			)}
			<FormRow
				error={fromError}
				hint={fromHint}
				htmlFor={idOf("effectiveFrom")}
				label={t(`${key}.from`)}
				layout="stacked"
			>
				<Controller
					control={control}
					name="effectiveFrom"
					render={({ field }) => (
						<DatePicker
							ref={field.ref}
							aria-invalid={Boolean(fromError)}
							disabled={isSubmitting}
							id={idOf("effectiveFrom")}
							isDateDisabled={(date): boolean => !allowedStart(startRule, date)}
							label={t(`${key}.from`)}
							mode="single"
							status={fromError ? "error" : undefined}
							value={field.value}
							aria-describedby={
								fromError
									? formRowIds(idOf("effectiveFrom")).errorId
									: formRowIds(idOf("effectiveFrom")).hintId
							}
							onBlur={field.onBlur}
							onChange={field.onChange}
						/>
					)}
				/>
			</FormRow>
			{values.effectiveFrom !== "" &&
				values.effectiveFrom < today &&
				startRule.kind === "monday" && (
					<Callout tone="warning">{t(`${key}.pastDate`)}</Callout>
				)}
			<fieldset className="flex flex-col gap-3">
				<legend className="mb-2 text-sm font-semibold text-neutral-900">
					{t(`${key}.ownHours`)}
				</legend>
				<div className="grid gap-4 sm:grid-cols-2">
					{ownField(
						"ownWeek",
						t(`${key}.ownWeek`),
						chosen
							? t(`${key}.ownWeekHint`, {
									week: formatHours(chosen.weekMinutes, language),
								})
							: undefined
					)}
					{ownField(
						"ownDay",
						t(`${key}.ownDay`),
						chosen?.dayMinutes
							? t(`${key}.ownDayHint`, {
									day: formatHours(chosen.dayMinutes, language),
								})
							: undefined
					)}
				</div>
			</fieldset>
			{mismatch && chosen && (
				<Callout tone="warning">
					{t(`employmentTerms.row.mismatch.${mismatch}`, {
						week: formatHours(
							own.contractedWeekMinutes ?? chosen.weekMinutes,
							language
						),
					})}
				</Callout>
			)}
		</CreateFormDialog>
	);
};
