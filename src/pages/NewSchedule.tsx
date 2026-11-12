import { useSearch } from "@tanstack/react-router";
import type { FunctionComponent } from "@/common/types";
import { CreateMonthSchedule } from "@/pages/CreateMonthSchedule";
import { CreateSchedule } from "@/pages/CreateSchedule";

/**
 * `/scheduling/new`: a saved draft the URL names (its week card or "View
 * setup") opens in the week wizard; anything new is made a month at a time.
 */
export const NewSchedule = (): FunctionComponent => {
	const search = useSearch({ from: "/_authenticated/_app/scheduling_/new" });
	return search.scheduleId !== undefined &&
		search.departmentId !== undefined ? (
		<CreateSchedule />
	) : (
		<CreateMonthSchedule />
	);
};
