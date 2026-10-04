import { createFileRoute } from "@tanstack/react-router";
import { SystemRoles } from "@/pages/SystemRoles";
export const Route = createFileRoute(
	"/_authenticated/_app/organisation/system-roles"
)({
	component: SystemRoles,
});
