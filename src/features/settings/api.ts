import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { companyPath } from "@/features/organisation/api";

const renamedCompanySchema = z.object({
	companyId: z.string(),
	name: z.string(),
});

/**
 * Renames the company (`PUT /api/v1/companies/{companyId}`), which the app
 * calls the workspace. Resolves to the name as saved: the API trims it and
 * collapses runs of spaces.
 */
export const renameCompany = async (
	companyId: string,
	name: string
): Promise<string> => {
	const renamed = await apiRequest(
		companyPath(companyId),
		renamedCompanySchema,
		{
			method: "PUT",
			body: { name: name.trim() },
		}
	);
	return renamed.name;
};
