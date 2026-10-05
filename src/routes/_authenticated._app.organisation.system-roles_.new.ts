import { createFileRoute } from "@tanstack/react-router";
import { workspaceQuery } from "@/features/workspace/api";
import { SystemRoleCreate } from "@/pages/SystemRoleCreate";

export const Route = createFileRoute(
	"/_authenticated/_app/organisation/system-roles_/new"
)({
	loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery),
	component: SystemRoleCreate,
});
