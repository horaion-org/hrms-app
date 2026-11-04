import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import type { DepartmentPath } from "@/features/scheduling/paths";
import {
	saveStartingDays,
	startingDaysKey,
	startingDaysQuery,
	type EnteredDay,
} from "@/features/scheduling/startingContext/api";
import { StartingContextCallout } from "@/features/scheduling/startingContext/StartingContextCallout";
import { StartingDaysDialog } from "@/features/scheduling/startingContext/StartingDaysDialog";
import {
	enteredMemberCount,
	initialEntries,
} from "@/features/scheduling/startingContext/startingGrid";

export type StartingContextSectionProps = {
	companyId: string;
	unit: DepartmentPath;
	scheduleId: string;
	/** Whether the person may change the draft (`schedule:update`, still a draft). */
	canEdit: boolean;
	className?: string;
};

/** The refusal codes the dialog words itself; anything else is a plain failure. */
const PROBLEMS = {
	INVALID_STARTING_DAY: "scheduling.startingContext.invalid",
	SCHEDULE_NOT_DRAFT: "scheduling.startingContext.notDraft",
} as const;

type ProblemKey = (typeof PROBLEMS)[keyof typeof PROBLEMS];

/** The words for a refused save: a known refusal's own, or the plain failure. */
const problemKeyOf = (
	error: unknown
): ProblemKey | "scheduling.startingContext.failed" => {
	const code = error instanceof ApiProblemError ? error.errorCode : undefined;
	return code === "INVALID_STARTING_DAY" || code === "SCHEDULE_NOT_DRAFT"
		? PROBLEMS[code]
		: "scheduling.startingContext.failed";
};

/**
 * The week before the period on the Generate step: the calm line saying where
 * everyone starts, and, where the draft may change, the grid to add last
 * week's days. Saving replaces the entered set and the grid answers as it now
 * stands. Nothing is shown until the week is read, or when it can't be.
 */
export const StartingContextSection = ({
	companyId,
	unit,
	scheduleId,
	canEdit,
	className,
}: StartingContextSectionProps): FunctionComponent => {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const week = useQuery(startingDaysQuery(companyId, unit, scheduleId));
	const saving = useMutation({
		mutationFn: (days: Array<EnteredDay>) =>
			saveStartingDays(companyId, unit, scheduleId, days),
		onSuccess: (answered) => {
			queryClient.setQueryData(
				startingDaysKey(companyId, scheduleId),
				answered
			);
			setOpen(false);
		},
	});
	if (week.data === undefined) return null;
	const problem = saving.isError ? t(problemKeyOf(saving.error)) : undefined;
	return (
		<>
			<StartingContextCallout
				className={className}
				enteredCount={enteredMemberCount(initialEntries(week.data))}
				week={week.data}
				onAdd={
					canEdit
						? (): void => {
								saving.reset();
								setOpen(true);
							}
						: undefined
				}
			/>
			{open && (
				<StartingDaysDialog
					open
					problem={problem}
					saving={saving.isPending}
					week={week.data}
					onClose={() => {
						setOpen(false);
					}}
					onSave={(days) => {
						saving.mutate(days);
					}}
				/>
			)}
		</>
	);
};
