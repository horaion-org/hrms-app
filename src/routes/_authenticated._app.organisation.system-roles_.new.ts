import { createFileRoute, redirect } from "@tanstack/react-router";

/** Creating an access role, at its old address: it now lives under Settings. */
export const Route = createFileRoute(
	"/_authenticated/_app/organisation/system-roles_/new"
)({
	beforeLoad: () =>
		redirect({ to: "/settings/access-roles/new", replace: true }),
});
