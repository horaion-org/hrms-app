import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import {
	formatDate,
	todayDate,
	type IsoDate,
} from "@/components/forms/Calendar";
import { DatePicker } from "@/components/forms/DatePicker";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import { Callout } from "@/components/ui/Callout";
import {
	activeTermsQuery,
	assignTermsInBulk,
	BULK_TERMS_MAX_PEOPLE,
	reloadTermsReads,
} from "@/features/employmentTerms/api";
import { bulkSummary } from "@/features/employmentTerms/bulkSummary";
import { termsSentence } from "@/features/employmentTerms/summary";
import { isMonday, nextMonday } from "@/features/employmentTerms/termsChanges";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { mapRefusal } from "@/features/organisation/refusal";

export type BulkChangeEmploymentTermsDialogProps = {
	companyId: string;
	/** The people chosen on the People list. */
	membershipIds: ReadonlyArray<string>;
	/** Called with the confirmation to show once they are moved. */
	onDone: (message: string) => void;
	onClose: () => void;
};

const key = "employmentTerms.bulk";

/**
 * Moves the people chosen on the People list to other terms from a Monday,
 * all at once (up to 500). Anyone already on them stays as they are; anyone
 * the caller may not change is skipped, and the confirmation says how many.
 */
export const BulkChangeEmploymentTermsDialog = ({
	companyId,
	membershipIds,
	onDone,
	onClose,
}: BulkChangeEmploymentTermsDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language ?? "en";
	const formId = useId();
	const termsId = `${formId}-terms`;
	const fromId = `${formId}-from`;
	const [today] = useState(() => todayDate(Date.now()));
	const terms = useQuery(activeTermsQuery(companyId));
	const activeTerms = terms.data?.terms;
	const [chosen, setChosen] = useState("");
	const [from, setFrom] = useState<IsoDate>(() => nextMonday(today));
	const client = useQueryClient();
	const move = useMutation({
		meta: { successMessage: false },
		mutationFn: () =>
			assignTermsInBulk(companyId, chosen, {
				membershipIds,
				effectiveFrom: from,
			}),
		onSuccess: () => reloadTermsReads(client, companyId),
	});
	const selected = activeTerms?.find((each) => each.id === chosen);
	const tooMany = membershipIds.length > BULK_TERMS_MAX_PEOPLE;
	const problem = move.error
		? mapRefusal(move.error, {
				alerts: {
					"429 RATE_LIMITED": t(`${key}.rateLimited`),
					"409 EMPLOYMENT_TERMS_INACTIVE": t("employmentTerms.change.inactive"),
					"400 EMPLOYMENT_TERMS_START_NOT_MONDAY": t(
						"employmentTerms.change.notMonday"
					),
				},
				forbidden: t(`${key}.forbidden`),
				failed: t(`${key}.failed`),
			}).message
		: tooMany
			? t(`${key}.tooMany`, { count: BULK_TERMS_MAX_PEOPLE })
			: undefined;
	return (
		<CreateFormDialog
			cancelLabel={t("employmentTerms.change.cancel")}
			description={t(`${key}.description`, { count: membershipIds.length })}
			formId={formId}
			message={problem}
			submitDisabled={!selected || tooMany}
			submitLabel={t(`${key}.submit`, { count: membershipIds.length })}
			submitting={move.isPending}
			title={t(`${key}.title`)}
			onClose={onClose}
			onSubmit={(event) => {
				event.preventDefault();
				if (!selected) return;
				move.mutate(undefined, {
					onSuccess: (outcome) => {
						onDone(
							bulkSummary(
								outcome,
								{ name: selected.name, date: formatDate(from, language) },
								t
							)
						);
						onClose();
					},
				});
			}}
		>
			<FormRow
				htmlFor={termsId}
				label={t("employmentTerms.change.terms")}
				layout="stacked"
				error={
					terms.isError ? t("employmentTerms.change.termsFailed") : undefined
				}
			>
				<Select
					aria-labelledby={formRowIds(termsId).labelId}
					className="w-full"
					disabled={move.isPending || terms.data === undefined}
					placeholder={t("employmentTerms.change.termsPlaceholder")}
					value={chosen}
					options={(activeTerms ?? []).map((each) => ({
						value: each.id,
						label: each.name,
					}))}
					onChange={setChosen}
				/>
			</FormRow>
			{selected && (
				<p className="text-sm text-neutral-800">
					{termsSentence(selected, terms.data?.reference, t, language)}
				</p>
			)}
			<FormRow
				hint={t("employmentTerms.change.mondayHint")}
				htmlFor={fromId}
				label={t("employmentTerms.change.from")}
				layout="stacked"
			>
				<DatePicker
					aria-describedby={formRowIds(fromId).hintId}
					disabled={move.isPending}
					id={fromId}
					isDateDisabled={(date) => !isMonday(date)}
					label={t("employmentTerms.change.from")}
					mode="single"
					value={from}
					onChange={(date) => {
						if (date) setFrom(date);
					}}
				/>
			</FormRow>
			{from < today && (
				<Callout tone="warning">{t("employmentTerms.change.pastDate")}</Callout>
			)}
		</CreateFormDialog>
	);
};
