import { Outlet, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState, PageState } from "@/components/ui/PageState";
import { Button } from "@/components/ui/Button";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { signOut } from "@/features/auth/cognito";
import { usePermissionsQuery } from "@/features/permissions/usePermissionsQuery";
import { activeMembership, useMeQuery } from "@/features/session/useMeQuery";
import { WorkspaceProvider } from "@/features/session/WorkspaceProvider";

/**
 * Resolves the workspace before rendering anything company-scoped. Every route
 * beneath this one may assume a Company identifier and a permission set exist.
 */
export const AuthenticatedLayout = (): FunctionComponent => {
	const navigate = useNavigate();
	const meQuery = useMeQuery();
	const membership = activeMembership(meQuery.data);
	const permissionsQuery = usePermissionsQuery(membership?.company_id);

	const leave = (): void => {
		signOut();
		void navigate({ to: "/sign-in" });
	};

	if (meQuery.isPending || permissionsQuery.isPending) {
		return <LoadingState />;
	}

	if (meQuery.isError) {
		// A revoked membership is a refusal the API can name, so say what
		// actually happened rather than blaming the network.
		const revoked =
			meQuery.error instanceof ApiProblemError &&
			meQuery.error.errorCode === "MEMBERSHIP_REVOKED";

		return (
			<PageState
				action={<Button onClick={leave}>Sign out</Button>}
				title={revoked ? "Access removed" : "We could not load your account"}
				description={
					revoked
						? "Your access to this company has been removed. Contact an administrator if you think this is a mistake."
						: meQuery.error.message
				}
			/>
		);
	}

	if (meQuery.data === undefined || membership === undefined) {
		return (
			<PageState
				action={<Button onClick={leave}>Sign out</Button>}
				description="Your access to this company has been removed. Contact an administrator if you think this is a mistake."
				title="No active company"
			/>
		);
	}

	return (
		<WorkspaceProvider
			value={{
				me: meQuery.data,
				membership,
				companyId: membership.company_id,
				permissions: new Set(permissionsQuery.data ?? []),
			}}
		>
			<AppShell onSignOut={leave}>
				<Outlet />
			</AppShell>
		</WorkspaceProvider>
	);
};
