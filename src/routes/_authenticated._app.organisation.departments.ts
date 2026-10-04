import { createFileRoute } from "@tanstack/react-router";
import { Departments } from "@/pages/Departments";
export const Route = createFileRoute(
	"/_authenticated/_app/organisation/departments"
)({
	component: Departments,
});
