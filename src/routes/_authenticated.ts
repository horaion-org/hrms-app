import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { accessToken } from "@/features/auth/cognito";

/**
 * Guards every route beneath it, in development too. It only decides whether
 * to redirect; whether the token still buys access is the API's call, made
 * again on every request.
 */
export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async () => {
		if ((await accessToken()) === null) {
			// TanStack Router signals navigation by throwing this sentinel; it is
			// control flow rather than an error.
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw redirect({ to: "/sign-in" });
		}
	},
	component: Outlet,
});
