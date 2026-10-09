import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";

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
 * The caller's visible unit tree with the permissions held at each node
 * (`GET /api/v1/me/workspace`). It decides what to show, never what is
 * allowed: the API still checks every request.
 */
export const workspaceQuery = queryOptions({
	queryKey: ["workspace"],
	queryFn: () => apiRequest("/api/v1/me/workspace", workspaceSchema),
	staleTime: Infinity,
});

/** Permissions held at the company itself; empty for a company not in the workspace. */
export const companyPermissions = (
	workspace: Workspace,
	companyId: string
): ReadonlySet<string> =>
	new Set(
		workspace.companies.find((company) => company.uuid === companyId)
			?.permissions ?? []
	);
