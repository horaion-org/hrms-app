import { createFileRoute } from "@tanstack/react-router";
import { JobTitles } from "@/pages/JobTitles";
export const Route = createFileRoute(
	"/_authenticated/_app/organisation/job-titles"
)({
	component: JobTitles,
});
