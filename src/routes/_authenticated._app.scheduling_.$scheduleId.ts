import { createFileRoute } from "@tanstack/react-router";
import { ScheduleDetailPage } from "@/pages/ScheduleDetail";

export const Route = createFileRoute(
	"/_authenticated/_app/scheduling_/$scheduleId"
)({
	component: ScheduleDetailPage,
});
