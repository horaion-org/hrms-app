import type { TFunction } from "i18next";
import { z } from "zod";
import { normalizeBranchCity } from "@/features/organisation/city";
import { nameSchema } from "@/features/organisation/nameSchema";

/** Mirrors the server's allow-lists; uniqueness remains a server decision. */
export const createBranchSchema = (
	t: TFunction,
	editing = false
): z.ZodObject<{
	name: z.ZodString;
	code: z.ZodString;
	country: z.ZodString;
	city: z.ZodPipe<
		z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>,
		z.ZodString
	>;
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
		name: nameSchema({
			required: t(`${key}.nameRequired`),
			length: t(`${key}.nameLength`),
			characters: t(`${key}.nameCharacters`),
		}),
		code: z
			.string()
			.trim()
			.toUpperCase()
			.min(1, t(`${key}.codeRequired`))
			.max(10, t(`${key}.codeLength`))
			.regex(/^[A-Z0-9-]+$/, t(`${key}.codeCharacters`)),
		city: z
			.string()
			.transform(normalizeBranchCity)
			.pipe(
				z
					.string()
					.min(1, t(`${key}.cityRequired`))
					.refine((value) => [...value].length <= 100, t(`${key}.cityLength`))
					.regex(/^[\p{L} .'-]+$/u, t(`${key}.cityCharacters`))
			),
		country: z.string().min(1, t(`${key}.countryRequired`)),
		heads: z
			.array(
				z.object({
					membershipId: z.string(),
					displayName: z.string(),
					status: z.enum(["ACTIVE", "INACTIVE"]),
				})
			)
			.min(editing ? 0 : 1, t(`${key}.headsRequired`))
			.max(20, t(`${key}.headsMax`)),
	});
};

export type CreateBranchValues = z.infer<ReturnType<typeof createBranchSchema>>;
