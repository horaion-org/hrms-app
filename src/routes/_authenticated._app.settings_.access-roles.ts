import { createFileRoute } from "@tanstack/react-router";
import { AccessRoles } from "@/pages/AccessRoles";
export const Route = createFileRoute(
	"/_authenticated/_app/settings_/access-roles"
)({
	component: AccessRoles,
});
