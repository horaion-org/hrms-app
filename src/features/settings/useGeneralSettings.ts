import { useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import { workspaceQuery } from "@/features/workspace/api";
import { DEFAULT_PREFERENCES } from "@/features/settings/options";
import type { GeneralSettingsValues } from "@/features/settings/schemas";

export type GeneralSettings =
	| { status: "pending" | "error" }
	| { status: "ready"; values: GeneralSettingsValues };

/** Retries what may pass next time (outages); a refusal or a bad request won't. */
const retry = (failureCount: number, error: Error): boolean =>
	failureCount < 2 && !(error instanceof ApiProblemError && error.status < 500);

/**
 * The General settings to start the form from. There is no settings endpoint
 * yet, so only the workspace name is real: it is the current company's name
 * from `GET /api/v1/me/workspace`. The rest are the product defaults.
 */
export const useGeneralSettings = (companyId: string): GeneralSettings => {
	const workspace = useQuery({ ...workspaceQuery, retry });
	if (workspace.isPending) return { status: "pending" };
	if (workspace.isError) return { status: "error" };
	const company = workspace.data.companies.find(
		(item) => item.uuid === companyId
	);
	return {
		status: "ready",
		values: { ...DEFAULT_PREFERENCES, workspaceName: company?.name ?? "" },
	};
};
