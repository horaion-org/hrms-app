import { useState } from "react";
import { Controller, useWatch, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { RadioCard } from "@/components/forms/RadioCard";
import {
	APPROVAL_STEP_MAX_MEMBERS,
	type ApprovalSubject,
	ELIGIBLE_APPROVERS_PAGE_SIZE,
} from "@/features/approvals/api";
import type { FlowValues } from "@/features/approvals/ApprovalFlowDialog/schema";
import { useEligibleApproverSearch } from "@/features/approvals/useEligibleApproverSearch";
import { MemberPickerField } from "@/features/organisation/MemberPickerField";

const key = "approvals.flows.dialog";

export type StepChoicesProps = {
	companyId: string;
	/** What the flow approves; the picker lists the people who can approve it. */
	subjectType: ApprovalSubject;
	/** Where the flow applies, "" for the company default; the picker lists the people who can approve there. */
	departmentId: string;
	control: Control<FlowValues>;
	/** The step's place in the form's `steps`. */
	index: number;
	/** Prefixes the ids the two radio groups and the people field label themselves with. */
	idPrefix: string;
	/** "Anyone who can publish in Front Office": the first choice, worded for the subject and place. */
	anyoneLabel: string;
	disabled: boolean;
	peopleHint: string;
	peopleError?: string;
};

/**
 * One step's "who decides" and, for named people, "how many of them": anyone
 * who holds the subject's review permission (`KEY_HOLDERS`), or only the
 * people named here (`MEMBERS`), then any one of them or all of them. The
 * people offered are only those who can approve the subject where the flow
 * applies.
 */
export const StepChoices = ({
	companyId,
	subjectType,
	departmentId,
	control,
	index,
	idPrefix,
	anyoneLabel,
	disabled,
	peopleHint,
	peopleError,
}: StepChoicesProps): FunctionComponent => {
	const { t } = useTranslation();
	const rule = useWatch({ control, name: `steps.${index}.rule` });
	const [query, setQuery] = useState("");
	const approvers = useEligibleApproverSearch(
		companyId,
		subjectType,
		departmentId,
		query,
		rule === "MEMBERS"
	);
	const approverCount = approvers.data?.total ?? 0;
	// No footer under an empty list: its line already says why nobody is shown.
	const approversFooter =
		approverCount === 0
			? undefined
			: t(
					approverCount > ELIGIBLE_APPROVERS_PAGE_SIZE
						? `${key}.approversTruncated`
						: `${key}.approversFooter`,
					{ total: approverCount }
				);
	return (
		<>
			<Controller
				control={control}
				name={`steps.${index}.rule`}
				render={({ field }) => (
					<div className="flex flex-col gap-2">
						<p className="text-sm text-neutral-800" id={`${idPrefix}-who`}>
							{t(`${key}.whoDecides`)}
						</p>
						<div
							aria-labelledby={`${idPrefix}-who`}
							className="grid gap-3"
							role="radiogroup"
						>
							<RadioCard
								checked={field.value === "KEY_HOLDERS"}
								description={t(`${key}.anyoneDescription`)}
								disabled={disabled}
								label={anyoneLabel}
								name={`${idPrefix}-rule`}
								value="KEY_HOLDERS"
								onChange={field.onChange}
							/>
							<RadioCard
								checked={field.value === "MEMBERS"}
								description={t(`${key}.onlyTheseDescription`)}
								disabled={disabled}
								label={t(`${key}.onlyThese`)}
								name={`${idPrefix}-rule`}
								value="MEMBERS"
								onChange={field.onChange}
							/>
						</div>
					</div>
				)}
			/>
			{rule === "MEMBERS" && (
				<>
					<Controller
						control={control}
						name={`steps.${index}.members`}
						render={({ field }) => (
							<MemberPickerField
								ref={field.ref}
								disabled={disabled}
								error={peopleError}
								footerText={approversFooter}
								hint={peopleHint}
								id={`${idPrefix}-people`}
								label={t(`${key}.people`)}
								loadFailed={approvers.isError}
								loading={approvers.isFetching}
								max={APPROVAL_STEP_MAX_MEMBERS}
								options={approvers.data?.items ?? []}
								placeholder={t(`${key}.peoplePlaceholder`)}
								query={query}
								value={field.value}
								noResultsText={t(
									query.trim() === ""
										? `${key}.noApprovers`
										: `${key}.noApproverMatch`
								)}
								onChange={field.onChange}
								onQueryChange={setQuery}
							/>
						)}
					/>
					<Controller
						control={control}
						name={`steps.${index}.quorum`}
						render={({ field }) => (
							<div className="flex flex-col gap-2">
								<p className="text-sm text-neutral-800" id={`${idPrefix}-how`}>
									{t(`${key}.how`)}
								</p>
								<div
									aria-labelledby={`${idPrefix}-how`}
									className="grid gap-3 sm:grid-cols-2"
									role="radiogroup"
								>
									<RadioCard
										checked={field.value === "ANY"}
										disabled={disabled}
										label={t(`${key}.any`)}
										name={`${idPrefix}-quorum`}
										value="ANY"
										onChange={field.onChange}
									/>
									<RadioCard
										checked={field.value === "ALL"}
										disabled={disabled}
										label={t(`${key}.all`)}
										name={`${idPrefix}-quorum`}
										value="ALL"
										onChange={field.onChange}
									/>
								</div>
							</div>
						)}
					/>
				</>
			)}
		</>
	);
};
