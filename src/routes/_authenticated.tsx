import {
	createFileRoute,
	Outlet,
	redirect,
	useRouteContext,
	useRouter,
} from "@tanstack/react-router";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { fetchCurrentUser } from "@/features/auth/api";
import { CompanyPicker } from "@/features/auth/components/CompanyPicker";
import {
	chooseCompany,
	settleCurrentCompany,
} from "@/features/auth/currentCompany";
import { hasAccessPass, renewSession, signOut } from "@/features/auth/session";

const toSignIn = (href: string): ReturnType<typeof redirect> =>
	redirect({ to: "/sign-in", search: { redirect: href } });

/**
 * Guards every route beneath it, in development too. Without an access pass
 * (a reload, a new tab) it renews one from the Session cookie; when the
 * Session has ended, or the API cannot be reached, it sends the person to
 * sign in and back here afterwards. Whether the pass still buys access is the
 * API's call, made again on every request.
 *
 * With a Session, it loads the current user (cached until sign-out) and
 * settles the Current Company, which routes beneath read from the context.
 */
export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ location, context }) => {
		if (!hasAccessPass()) {
			const token = await renewSession().catch(() => null);

			if (token === null) {
				// TanStack Router signals navigation by throwing this sentinel; it
				// is control flow rather than an error.
				// eslint-disable-next-line @typescript-eslint/only-throw-error
				throw toSignIn(location.href);
			}
		}

		const currentUser = await context.queryClient
			.ensureQueryData({ queryKey: ["me"], queryFn: fetchCurrentUser })
			.catch((error: unknown) => {
				// A refusal ends the Session, which clears the cache and cancels
				// this very query; either way the person must sign in again.
				const refused =
					error instanceof ApiProblemError && error.isUnauthenticated;

				if (refused || !hasAccessPass()) {
					// eslint-disable-next-line @typescript-eslint/only-throw-error
					throw toSignIn(location.href);
				}

				throw error;
			});

		return { currentUser, currentCompany: settleCurrentCompany(currentUser) };
	},
	// The guarded page once a Current Company is settled; the picker until then.
	component: function GuardedOutlet(): FunctionComponent {
		const router = useRouter();
		const { currentCompany } = useRouteContext({ from: "/_authenticated" });

		if (currentCompany.status === "settled") {
			return <Outlet />;
		}

		return (
			<CompanyPicker
				companies={
					currentCompany.status === "choosing" ? currentCompany.companies : []
				}
				onChoose={(companyId) => {
					chooseCompany(companyId);
					void router.invalidate();
				}}
				onSignOut={() => {
					void signOut();
				}}
			/>
		);
	},
});
