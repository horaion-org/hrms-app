import { createFileRoute } from "@tanstack/react-router";
import { parseTimelineSearch } from "@/features/scheduling/timeline/timelineSearch";
import { DepartmentSchedulePage } from "@/pages/DepartmentSchedule";

/**
 * One Department's schedules on one timeline,
 * `/scheduling/department?department=…`; the page checks `schedule:read`.
 */
export const Route = createFileRoute(
	"/_authenticated/_app/scheduling_/department"
)({
	validateSearch: parseTimelineSearch,
	component: DepartmentSchedulePage,
});
