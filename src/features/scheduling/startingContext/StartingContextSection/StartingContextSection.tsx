import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DepartmentPath } from "@/common/companyPath";
import { joinClassNames } from "@/common/joinClassNames";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import type { DayRun } from "@/features/scheduling/dates/api";
import { OpeningHoursSection } from "@/features/scheduling/hours/OpeningHoursSection";
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
	previousWeekOf,
	initialEntries,
	unansweredDays,
} from "@/features/scheduling/startingContext/startingGrid";

/** Which dialog to open once the draft has been read: last week's days, or the hours worked this month. */
export type StartingPointDialog = "days" | "hours";

export type StartingContextSectionProps = {
	companyId: string;
	unit: DepartmentPath;
	scheduleId: string;
	/** The schedule's types for a day off; empty from an older API. */
	nonWorkingDayTypes: ReadonlyArray<string>;
	/** Whether the person may change the draft (`schedule:update`, still a draft). */
	canEdit: boolean;
	/** Opens a dialog as soon as the draft has been read, for a caller that just saved the draft to add to it. */
	openOnStart?: StartingPointDialog;
	/**
	 * Whether the hours worked this month show; true when left out. Left out
	 * for a later week of a month run: a month has one opening per person,
	 * entered on its first week.
	 */
	showsHours?: boolean;
	/** This week's days before its first generated day, when it has begun; the notice names those still unknown. */
	daysBefore?: DayRun;
	className?: string;
};

/** The refusal codes the days dialog words itself; anything else is a plain failure. */
const PROBLEMS = {
	INVALID_STARTING_DAY: "scheduling.startingContext.invalid",
	SCHEDULE_NOT_DRAFT: "scheduling.startingContext.notDraft",
} as const;

type ProblemCode = keyof typeof PROBLEMS;

const isProblemCode = (code: string | undefined): code is ProblemCode =>
	code !== undefined && code in PROBLEMS;

/** The words for a refused save: a known refusal's own, or the plain failure. */
const problemKeyOf = (
	error: unknown
): (typeof PROBLEMS)[ProblemCode] | "scheduling.startingContext.failed" => {
	const code = error instanceof ApiProblemError ? error.errorCode : undefined;
	return isProblemCode(code)
		? PROBLEMS[code]
		: "scheduling.startingContext.failed";
};

/**
 * Where everyone starts on the Generate step, in two parts: the line about
 * last week with the grid to add its days, and, below it, the hours people
 * already worked this month with their own dialog (OpeningHoursSection).
 * Each saves on its own.
 */
export const StartingContextSection = ({
	companyId,
	unit,
	scheduleId,
	nonWorkingDayTypes,
	canEdit,
	openOnStart,
	showsHours = true,
	daysBefore,
	className,
}: StartingContextSectionProps): FunctionComponent => {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [daysOpen, setDaysOpen] = useState(false);
	const [hoursOpen, setHoursOpen] = useState(false);
	const week = useQuery(startingDaysQuery(companyId, unit, scheduleId));
	const saving = useMutation({
		mutationFn: (days: Array<EnteredDay>) =>
			saveStartingDays(companyId, unit, scheduleId, days),
		onSuccess: (answered) => {
			queryClient.setQueryData(
				startingDaysKey(companyId, scheduleId),
				answered
			);
			setDaysOpen(false);
		},
	});
	// Opened once, when the draft has been read.
	const [openedOnStart, setOpenedOnStart] = useState(false);
	if (openOnStart && canEdit && !openedOnStart && week.data !== undefined) {
		setOpenedOnStart(true);
		if (openOnStart === "days") setDaysOpen(true);
		else setHoursOpen(true);
	}
	if (week.data === undefined) return null;
	return (
		<div className={joinClassNames("flex flex-col gap-4", className)}>
			<StartingContextCallout
				enteredCount={enteredMemberCount(initialEntries(week.data))}
				previous={previousWeekOf(week.data)}
				unknownDays={daysBefore && unansweredDays(week.data, daysBefore)}
				onAdd={
					canEdit
						? (): void => {
								saving.reset();
								setDaysOpen(true);
							}
						: undefined
				}
			/>
			{showsHours && (
				<OpeningHoursSection
					canEdit={canEdit}
					companyId={companyId}
					generated={false}
					open={hoursOpen}
					scheduleId={scheduleId}
					unit={unit}
					onOpenChange={setHoursOpen}
				/>
			)}
			{daysOpen && (
				<StartingDaysDialog
					open
					nonWorkingDayTypes={nonWorkingDayTypes}
					problem={saving.isError ? t(problemKeyOf(saving.error)) : undefined}
					saving={saving.isPending}
					week={week.data}
					onClose={() => {
						setDaysOpen(false);
					}}
					onSave={(days) => {
						saving.mutate(days);
					}}
				/>
			)}
		</div>
	);
};
