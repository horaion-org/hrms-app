import { createFileRoute, redirect } from "@tanstack/react-router";

/** The access roles list's old address: it now lives under Settings, so old links and bookmarks still open it. */
export const Route = createFileRoute(
	"/_authenticated/_app/organisation/system-roles"
)({
	beforeLoad: () => redirect({ to: "/settings/access-roles", replace: true }),
});
