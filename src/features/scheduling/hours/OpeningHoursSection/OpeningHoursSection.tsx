import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { DepartmentPath } from "@/common/companyPath";
import { formattingLocale } from "@/common/formattingLocale";
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
	OpeningHoursCallout,
	type OpeningHoursState,
} from "@/features/scheduling/hours/OpeningHoursCallout";
import { OpeningHoursDialog } from "@/features/scheduling/hours/OpeningHoursDialog";
import { unknownOpeningCount } from "@/features/scheduling/hours/openingSummary";
import { formatDayAndMonth } from "@/features/scheduling/months/monthWeeks";
import { startingDaysQuery } from "@/features/scheduling/startingContext/api";

export type OpeningHoursSectionProps = {
	companyId: string;
	unit: DepartmentPath;
	scheduleId: string;
	/** Whether the person may change the hours: `schedule:update`, on a week that isn't published. */
	canEdit: boolean;
	/** Whether the week already has a roster, which the hours change only once it is generated again. */
	generated: boolean;
	/** Whether the hours dialog is open; the caller owns it so another control can open it. */
	open: boolean;
	onOpenChange: (open: boolean) => void;
	className?: string;
};

/** The refusal codes the dialog words itself; anything else is a plain failure. */
const PROBLEMS = {
	INVALID_OPENING_BALANCE: "scheduling.openingHours.invalid",
	OPENING_BALANCE_LOCKED: "scheduling.openingHours.locked",
	OPENING_BALANCES_PUBLISHED: "scheduling.openingHours.published",
} as const;

type ProblemCode = keyof typeof PROBLEMS;

const isProblemCode = (code: string | undefined): code is ProblemCode =>
	code !== undefined && code in PROBLEMS;

/** The words for a refused save: a known refusal's own, or the plain failure. */
const problemKeyOf = (
	error: unknown
): (typeof PROBLEMS)[ProblemCode] | "scheduling.openingHours.failed" => {
	const code = error instanceof ApiProblemError ? error.errorCode : undefined;
	return isProblemCode(code)
		? PROBLEMS[code]
		: "scheduling.openingHours.failed";
};

/** What the line says, from the openings read. */
const hoursStateOf = (
	openings: OpeningBalances | undefined,
	failed: boolean
): OpeningHoursState | undefined => {
	if (failed) return { kind: "failed" };
	if (openings === undefined) return undefined;
	if (!openings.applies) return { kind: "notNeeded" };
	return { kind: "read", unknownCount: unknownOpeningCount(openings) };
};

/**
 * The hours people already worked this month before a roster, as their own
 * section: the line saying how many are unknown, and the dialog to add them.
 * Reads the roster's opening balances, and its starting days for the people's
 * names; saving puts only the changed people and keeps the dialog open with
 * the typed hours when refused. Says so, with a retry, when the read fails.
 */
export const OpeningHoursSection = ({
	companyId,
	unit,
	scheduleId,
	canEdit,
	generated,
	open,
	onOpenChange,
	className,
}: OpeningHoursSectionProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const queryClient = useQueryClient();
	const openings = useQuery(openingBalancesQuery(companyId, unit, scheduleId));
	const people = useQuery(startingDaysQuery(companyId, unit, scheduleId));
	const saving = useMutation({
		mutationFn: (entries: Array<OpeningEntry>) =>
			saveOpeningBalances(companyId, unit, scheduleId, entries),
		meta: { successMessage: "scheduling.openingHours.saved" },
		onSuccess: (answered) => {
			queryClient.setQueryData(
				openingBalancesKey(companyId, scheduleId),
				answered
			);
			onOpenChange(false);
		},
	});
	const hours = hoursStateOf(openings.data, openings.isError);
	if (hours === undefined) return null;
	const anyEditable =
		openings.data?.members.some((member) => member.editable) === true;
	const canOpen = canEdit && anyEditable && people.data !== undefined;
	const asOf = openings.data?.asOf ?? "";

	return (
		<>
			<OpeningHoursCallout
				asOf={asOf}
				className={className}
				hours={hours}
				onAdd={
					canOpen
						? (): void => {
								saving.reset();
								onOpenChange(true);
							}
						: undefined
				}
				onRetry={() => {
					void openings.refetch();
				}}
			/>
			{open && canOpen && openings.data && people.data && (
				<OpeningHoursDialog
					open
					generated={generated}
					openings={openings.data}
					people={people.data.members}
					saving={saving.isPending}
					problem={
						saving.isError
							? t(problemKeyOf(saving.error), {
									day: formatDayAndMonth(asOf, formattingLocale(i18n)),
								})
							: undefined
					}
					onClose={() => {
						onOpenChange(false);
					}}
					onSave={(entries) => {
						saving.mutate(entries);
					}}
				/>
			)}
		</>
	);
};
