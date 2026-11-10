import { Controller, useWatch, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { RadioCard } from "@/components/forms/RadioCard";
import { APPROVAL_STEP_MAX_MEMBERS } from "@/features/approvals/api";
import type { FlowValues } from "@/features/approvals/ApprovalFlowDialog/schema";
import { HeadsField } from "@/features/organisation/HeadsField";

const key = "approvals.flows.dialog";

export type StepChoicesProps = {
	companyId: string;
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
 * people named here (`MEMBERS`), then any one of them or all of them.
 */
export const StepChoices = ({
	companyId,
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
							<HeadsField
								ref={field.ref}
								companyId={companyId}
								disabled={disabled}
								error={peopleError}
								hint={peopleHint}
								id={`${idPrefix}-people`}
								label={t(`${key}.people`)}
								max={APPROVAL_STEP_MAX_MEMBERS}
								placeholder={t(`${key}.peoplePlaceholder`)}
								value={field.value}
								onChange={field.onChange}
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
