import { apiRequest } from "@/common/api-client";
import type { Me } from "@/common/api";

/**
 * The tenancy bootstrap. A Cognito token carries only the subject, so this is
 * the only way the client learns a Company identifier. Nothing company-scoped
 * may be requested before it resolves.
 */
export async function fetchMe(): Promise<Me> {
	return apiRequest<Me>("/api/v1/me");
}
