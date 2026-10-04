import type { TFunction } from "i18next";
import { z } from "zod";

/** Mirrors the server's name allow-list; uniqueness remains a server decision. */
export const createBranchSchema = (
	t: TFunction
): z.ZodObject<{
	name: z.ZodString;
	heads: z.ZodArray<
		z.ZodObject<{
			membershipId: z.ZodString;
			displayName: z.ZodString;
			status: z.ZodEnum<{ ACTIVE: "ACTIVE"; INACTIVE: "INACTIVE" }>;
		}>
	>;
}> => {
	const key = "organisation.branches.createDialog";
	return z.object({
		name: z
			.string()
			.trim()
			.min(1, t(`${key}.nameRequired`))
			.min(2, t(`${key}.nameLength`))
			.max(100, t(`${key}.nameLength`))
			.regex(/^[\p{L}\p{N} .'&-]+$/u, t(`${key}.nameCharacters`)),
		heads: z
			.array(
				z.object({
					membershipId: z.string(),
					displayName: z.string(),
					status: z.enum(["ACTIVE", "INACTIVE"]),
				})
			)
			.min(1, t(`${key}.headsRequired`))
			.max(20, t(`${key}.headsMax`)),
	});
};

export type CreateBranchValues = z.infer<ReturnType<typeof createBranchSchema>>;
