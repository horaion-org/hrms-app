import { createFileRoute, redirect } from "@tanstack/react-router";
import { ApiProblemError, UnreachableError } from "@/common/problem";
import {
	settleCurrentCompany,
	type CurrentCompany,
} from "@/features/auth/currentCompany";
import { CompanySelection } from "@/pages/CompanySelection";
import { Unreachable } from "@/pages/Unreachable";
import { fetchCurrentUser } from "@/features/auth/api";
import { hasAccessPass, renewSession } from "@/features/auth/session";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ location, context }) => {
		if (!hasAccessPass()) {
			const outcome = await renewSession();
			switch (outcome.kind) {
				case "renewed":
					break;
				case "expired":
					return redirect({
						to: "/login",
						search: { redirect: location.href },
					});
				case "unreachable":
					throw new UnreachableError("Session renewal could not be reached");
				default: {
					const exhaustive: never = outcome;
					return exhaustive;
				}
			}
		}
		try {
			const currentUser = await context.queryClient.ensureQueryData({
				queryKey: ["me"],
				queryFn: fetchCurrentUser,
				staleTime: Infinity,
				gcTime: Infinity,
				retry: false,
			});
			// Set when web storage refused the choice; checked, not asserted, because the cache is untyped.
			const sessionChoice: unknown = context.queryClient.getQueryData([
				"current-company-choice",
			]);
			return {
				currentUser,
				currentCompany: settleCurrentCompany(
					currentUser,
					typeof sessionChoice === "string" ? sessionChoice : undefined
				),
			};
		} catch (cause) {
			if (
				cause instanceof ApiProblemError &&
				cause.status === 401 &&
				!hasAccessPass()
			)
				return redirect({ to: "/login", search: { redirect: location.href } });
			if (
				cause instanceof ApiProblemError &&
				cause.status === 403 &&
				(cause.errorCode === "MEMBERSHIP_REVOKED" ||
					cause.errorCode === "AUTHORIZATION_DENIED")
			)
				return {
					currentUser: null,
					currentCompany: { kind: "none" } satisfies CurrentCompany,
				};
			throw cause;
		}
	},
	component: CompanySelection,
	errorComponent: Unreachable,
});
