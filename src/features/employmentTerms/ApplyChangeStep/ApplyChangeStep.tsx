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
import { Input } from "@/components/forms/Input";
import { RadioCard } from "@/components/forms/RadioCard";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type {
	ApplyChange,
	EmploymentTermsBody,
} from "@/features/employmentTerms/api";
import {
	isMonday,
	nextMonday,
	successorNameOf,
} from "@/features/employmentTerms/termsChanges";
import { TERMS_NAME_MAX_LENGTH } from "@/features/employmentTerms/termsForm";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";

export type ApplyChangeStepProps = {
	/** The held terms' current name, and how many people they reach (0 when the app can't count them). */
	currentName: string;
	peopleCount: number;
	/** The terms are the Default for new people; the new terms take that mark over. */
	isDefault?: boolean;
	/** The changed terms about to be saved. */
	next: EmploymentTermsBody;
	/** Start on "Change from a date" (the row menu's item) rather than "Correct". */
	preferFromDate?: boolean;
	saving: boolean;
	/** Why the last save was refused, shown above the choice. */
	problem?: string;
	onBack: () => void;
	onApply: (apply: ApplyChange) => void;
	onClose: () => void;
};

const key = "employmentTerms.apply";

/**
 * The second step of saving terms people hold when their week changes:
 * correct it for everyone (their hours are counted again), or keep these
 * terms for the past and move everyone to new terms from a Monday.
 */
export const ApplyChangeStep = ({
	currentName,
	peopleCount,
	isDefault = false,
	next,
	preferFromDate = false,
	saving,
	problem,
	onBack,
	onApply,
	onClose,
}: ApplyChangeStepProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language ?? "en";
	const formId = useId();
	const fromId = `${formId}-from`;
	const successorId = `${formId}-successor`;
	const [today] = useState(() => todayDate(Date.now()));
	const [mode, setMode] = useState<ApplyChange["mode"]>(
		preferFromDate ? "FROM_DATE" : "CORRECT"
	);
	const [fromDate, setFromDate] = useState<IsoDate>(() => nextMonday(today));
	// The suggested name follows the date until someone types their own.
	const [typedName, setTypedName] = useState<string>();
	const successorName =
		typedName ?? successorNameOf(currentName, next, fromDate, t, language);
	const nameMissing = mode === "FROM_DATE" && successorName.trim() === "";
	return (
		<CreateFormDialog
			cancelLabel={t("employmentTerms.dialog.cancel")}
			description={t(`${key}.description`, { name: currentName })}
			formId={formId}
			message={problem}
			submitDisabled={nameMissing}
			submitLabel={t(`${key}.save`)}
			submitting={saving}
			title={t(`${key}.title`)}
			extraActions={
				<Button disabled={saving} variant="secondary" onClick={onBack}>
					{t(`${key}.back`)}
				</Button>
			}
			onClose={onClose}
			onSubmit={(event) => {
				event.preventDefault();
				onApply(
					mode === "CORRECT"
						? { mode }
						: { mode, startsOn: fromDate, newName: successorName.trim() }
				);
			}}
		>
			<div
				aria-label={t(`${key}.title`)}
				className="grid gap-4"
				role="radiogroup"
			>
				<RadioCard
					checked={mode === "CORRECT"}
					description={t(`${key}.correctDescription`, { count: peopleCount })}
					disabled={saving}
					label={t(`${key}.correct`)}
					name={`${formId}-mode`}
					value="CORRECT"
					onChange={() => {
						setMode("CORRECT");
					}}
				/>
				<RadioCard
					checked={mode === "FROM_DATE"}
					disabled={saving}
					label={t(`${key}.fromDate`)}
					name={`${formId}-mode`}
					value="FROM_DATE"
					description={[
						t(`${key}.fromDateDescription`, {
							count: peopleCount,
							name: currentName,
							successor: successorName.trim() || t(`${key}.newTerms`),
							date: formatDate(fromDate, language),
						}),
						...(isDefault
							? [
									t(`${key}.becomesDefault`, {
										successor: successorName.trim() || t(`${key}.newTerms`),
									}),
								]
							: []),
					].join(" ")}
					onChange={() => {
						setMode("FROM_DATE");
					}}
				/>
			</div>
			{mode === "FROM_DATE" && (
				<>
					<FormRow
						hint={t(`${key}.mondayHint`)}
						htmlFor={fromId}
						label={t(`${key}.from`)}
						layout="stacked"
					>
						<DatePicker
							aria-describedby={formRowIds(fromId).hintId}
							disabled={saving}
							id={fromId}
							isDateDisabled={(date) => !isMonday(date)}
							label={t(`${key}.from`)}
							mode="single"
							value={fromDate}
							onChange={(date) => {
								if (date) setFromDate(date);
							}}
						/>
					</FormRow>
					{fromDate < today && (
						<Callout tone="warning">{t(`${key}.pastDate`)}</Callout>
					)}
					<FormRow
						htmlFor={successorId}
						label={t(`${key}.successor`)}
						layout="stacked"
					>
						<Input
							className="w-full"
							disabled={saving}
							id={successorId}
							maxLength={TERMS_NAME_MAX_LENGTH}
							value={successorName}
							onChange={(event) => {
								setTypedName(event.target.value);
							}}
						/>
					</FormRow>
				</>
			)}
		</CreateFormDialog>
	);
};
