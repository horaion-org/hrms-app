import { createFileRoute, redirect } from "@tanstack/react-router";
import { accessToken } from "@/features/auth/cognito";
import { AuthenticatedLayout } from "@/features/session/AuthenticatedLayout";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async () => {
		// Only a redirect decision. Whether the token still buys access is the
		// API's call, re-made on every request.
		if ((await accessToken()) === null) {
			// TanStack Router signals navigation by throwing this sentinel; it is
			// control flow rather than an error.
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw redirect({ to: "/sign-in" });
		}
	},
	component: AuthenticatedLayout,
});
