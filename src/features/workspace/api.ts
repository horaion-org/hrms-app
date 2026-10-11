import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { selfMeta } from "@/features/workspace/queryAccess";

const permissionsSchema = z.array(z.string());

const unitStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

const workspaceSchema = z.object({
	companies: z.array(
		z.object({
			uuid: z.string(),
			name: z.string(),
			permissions: permissionsSchema,
			branches: z.array(
				z.object({
					uuid: z.string(),
					name: z.string(),
					status: unitStatusSchema,
					/** ISO 3166-1 alpha-2, for grouping Branches in selectors; not a grant. */
					country: z.string(),
					permissions: permissionsSchema,
					departments: z.array(
						z.object({
							uuid: z.string(),
							name: z.string(),
							status: unitStatusSchema,
							permissions: permissionsSchema,
						})
					),
				})
			),
		})
	),
});

export type Workspace = z.infer<typeof workspaceSchema>;

/**
 * The caller's visible unit tree with the effective permissions at each node
 * (`GET /api/v1/me/workspace`): the API has already applied inheritance, so
 * a node's list is complete on its own. It decides what to show, never what
 * is allowed: the API still checks every request.
 *
 * It is kept fresh within bounds rather than forever: reloaded when older
 * than 30 s and the window regains focus or the network returns, and polled
 * every minute while the page is visible, so a grant changed in another
 * session shows up without logging out. These are presentation intervals,
 * not a security expiry. A reload keeps the previous answer on screen until
 * the new one arrives, so gated controls do not flicker.
 */
export const workspaceQuery = queryOptions({
	queryKey: ["workspace"],
	queryFn: ({ signal }) =>
		apiRequest("/api/v1/me/workspace", workspaceSchema, { signal }),
	staleTime: 30_000,
	refetchOnWindowFocus: true,
	refetchOnReconnect: true,
	refetchInterval: 60_000,
	refetchIntervalInBackground: false,
	meta: selfMeta(),
});

/**
 * Permissions effective at the company itself; empty for a company not in
 * the workspace. For permission-set arithmetic such as the role editor's
 * subset rule; to gate a control, use `useAccess` with `COMPANY_SCOPE`.
 */
export const companyPermissions = (
	workspace: Workspace,
	companyId: string
): ReadonlySet<string> =>
	new Set(
		workspace.companies.find((company) => company.uuid === companyId)
			?.permissions ?? []
	);
