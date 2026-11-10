import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DepartmentPath } from "@/common/companyPath";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import {
	openingBalancesKey,
	openingBalancesQuery,
	saveOpeningBalances,
	type OpeningBalances,
	type OpeningEntry,
} from "@/features/scheduling/hours/api";
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
	INVALID_OPENING_BALANCE: "scheduling.startingContext.opening.invalid",
	OPENING_BALANCE_LOCKED: "scheduling.startingContext.opening.locked",
	OPENING_BALANCES_PUBLISHED: "scheduling.startingContext.opening.published",
} as const;

type ProblemCode = keyof typeof PROBLEMS;
type ProblemKey = (typeof PROBLEMS)[ProblemCode];

const isProblemCode = (code: string | undefined): code is ProblemCode =>
	code !== undefined && code in PROBLEMS;

/** The words for a refused request: a known refusal's own, or the plain failure. */
const problemKeyOf = (
	error: unknown
): ProblemKey | "scheduling.startingContext.failed" => {
	const code = error instanceof ApiProblemError ? error.errorCode : undefined;
	return isProblemCode(code)
		? PROBLEMS[code]
		: "scheduling.startingContext.failed";
};

/**
 * What one save answered: the days always went through by then; the openings
 * may have been refused, which the dialog shows while keeping the typed hours
 * (the two are separate requests).
 */
type Saved = { openingsRefusal?: unknown };

/** What one save sends: the week's entered days and, when any changed, the openings. */
type Entered = {
	days: Array<EnteredDay>;
	openings: Array<OpeningEntry> | undefined;
};

/**
 * The week before the period on the Generate step: the calm line saying where
 * everyone starts, and, where the draft may change, the grid to add last
 * week's days and, for a roster starting mid-month, each member's hours and
 * overtime so far this month. The grid opens only once the openings have been
 * read (or failed to read), so it never saves over figures it did not see.
 * Saving puts the days, then only the openings that changed; the days' answer
 * is kept even when the openings are refused, and the dialog stays open with
 * the typed hours so the person can fix them and save again.
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
	const openings = useQuery(openingBalancesQuery(companyId, unit, scheduleId));
	const saving = useMutation({
		mutationFn: async (entered: Entered): Promise<Saved> => {
			const answeredWeek = await saveStartingDays(
				companyId,
				unit,
				scheduleId,
				entered.days
			);
			queryClient.setQueryData(
				startingDaysKey(companyId, scheduleId),
				answeredWeek
			);
			if (entered.openings === undefined) return {};
			try {
				const answeredOpenings: OpeningBalances = await saveOpeningBalances(
					companyId,
					unit,
					scheduleId,
					entered.openings
				);
				queryClient.setQueryData(
					openingBalancesKey(companyId, scheduleId),
					answeredOpenings
				);
				return {};
			} catch (refusal) {
				return { openingsRefusal: refusal };
			}
		},
		onSuccess: (saved) => {
			if (saved.openingsRefusal === undefined) setOpen(false);
		},
	});
	if (week.data === undefined) return null;
	const openingsRefusal = saving.data?.openingsRefusal;
	const problem = saving.isError
		? t(problemKeyOf(saving.error))
		: openingsRefusal === undefined
			? undefined
			: t("scheduling.startingContext.opening.daysSavedHoursNot", {
					reason: t(problemKeyOf(openingsRefusal)),
				});
	return (
		<>
			<StartingContextCallout
				className={className}
				enteredCount={enteredMemberCount(initialEntries(week.data))}
				week={week.data}
				onAdd={
					canEdit && !openings.isPending
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
					openings={openings.data}
					problem={problem}
					saving={saving.isPending}
					week={week.data}
					onClose={() => {
						setOpen(false);
					}}
					onSave={(days, changedOpenings) => {
						saving.mutate({ days, openings: changedOpenings });
					}}
				/>
			)}
		</>
	);
};
