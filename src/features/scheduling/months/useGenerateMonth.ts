import { useMutation, useQuery } from "@tanstack/react-query";
import { constraintsQuery } from "@/features/scheduling/constraints/api";
import {
	type GenerateMonthBody,
	generateMonth,
	type MonthGeneration,
	type ScheduleMonth,
} from "@/features/scheduling/months/api";
import {
	generateMonthBody,
	MONTH_SETUP_DEFAULTS,
	type MonthChoices,
	type MonthSetup,
	weeksToCreate,
} from "@/features/scheduling/months/monthGeneration";
import { useReloadScheduling } from "@/features/scheduling/schedules/useSchedule";
import { departmentShiftsQuery } from "@/features/scheduling/shifts/api";
import { allOf, type WeekChoiceIds } from "@/features/scheduling/weekChoice";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/**
 * Why Generate can't run for this month, besides the Department's readiness:
 * no `schedule:create` for the weeks it would make, the Department's shifts or
 * constraints unreadable, or still loading (no note is shown for that one).
 */
export type GenerateBlock = "listsHidden" | "cannotCreate" | "listsLoading";

/** What one Generate sends besides the month: the chosen weeks and the setup of the weeks it creates. */
export type GenerateInput = { choices?: MonthChoices; setup?: MonthSetup };

export type GenerateMonth = {
	/** Posts the month; a week without a given choice gets "everything". */
	generate: (input?: GenerateInput) => Promise<MonthGeneration>;
	isPending: boolean;
	error: Error | null;
	/** The last answer, for the weeks it refused. */
	answer: MonthGeneration | undefined;
	/** Set when the month needs new weeks and they can't be made yet: see GenerateBlock. */
	block: GenerateBlock | undefined;
};

/**
 * Generates one Department's month through the month route: every Generate
 * and Regenerate in the app goes through here. "Everything" for a week the
 * run creates is the week wizard's `allOf` over the Department's live shifts
 * and constraints, read as the wizard reads them (only where `shift:read`
 * and `constraint:read` are held there). After the post, every scheduling
 * query reloads, as after any schedule write.
 */
export const useGenerateMonth = (
	companyId: string,
	scheduleMonth: ScheduleMonth | undefined
): GenerateMonth => {
	const access = useAccess();
	const unit = scheduleMonth && {
		branchId: scheduleMonth.branchId,
		departmentId: scheduleMonth.departmentId,
	};
	const scope = unit && departmentScope(unit.departmentId);
	const readsShifts = scope !== undefined && access.can("shift:read", scope);
	const readsConstraints =
		scope !== undefined && access.can("constraint:read", scope);
	const shifts = useQuery(departmentShiftsQuery(companyId, unit, readsShifts));
	const constraints = useQuery(
		constraintsQuery(companyId, unit, readsConstraints)
	);
	const everything: WeekChoiceIds | undefined =
		shifts.data && constraints.data
			? allOf(shifts.data, constraints.data)
			: undefined;
	const reload = useReloadScheduling(companyId);
	const mutation = useMutation({
		meta: { successMessage: false },
		mutationFn: ({
			month,
			body,
		}: {
			month: ScheduleMonth;
			body: GenerateMonthBody;
		}): Promise<MonthGeneration> =>
			generateMonth(companyId, month.departmentId, month.month, body),
		onSettled: reload,
	});
	const createsWeeks =
		scheduleMonth !== undefined && weeksToCreate(scheduleMonth).length > 0;
	const block: GenerateBlock | undefined = !createsWeeks
		? undefined
		: access.status !== "ready"
			? "listsLoading"
			: scope === undefined || !access.can("schedule:create", scope)
				? "cannotCreate"
				: !readsShifts || !readsConstraints
					? "listsHidden"
					: everything === undefined
						? "listsLoading"
						: undefined;

	return {
		// The body is built from this render's lists, so a click after they load always sends "everything".
		generate: (input: GenerateInput = {}): Promise<MonthGeneration> => {
			if (!scheduleMonth)
				return Promise.reject(new Error("no month to generate"));
			return mutation.mutateAsync({
				month: scheduleMonth,
				body: generateMonthBody(
					scheduleMonth,
					input.choices ?? {},
					everything,
					input.setup ?? MONTH_SETUP_DEFAULTS
				),
			});
		},
		isPending: mutation.isPending,
		error: mutation.error,
		answer: mutation.data,
		block,
	};
};
