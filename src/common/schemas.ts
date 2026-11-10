/*
 * API shapes several features read: a company member named on a record,
 * and the envelope of a paged list.
 */
import { z } from "zod";

/** A company member as a record names them. */
export const memberRefSchema = z.object({
	membershipId: z.string(),
	displayName: z.string(),
});

/** A company member named on a record that outlives the membership; `displayName` is null once they have left the company. */
export const formerMemberRefSchema = memberRefSchema.extend({
	displayName: z.string().nullable(),
});

const pageTotalSchema = z.object({
	totalElements: z.number().int().nonnegative(),
});

/** A paged list as the API sends it: one page of `item`s, and how many match in all. */
export const pagedSchema = <T extends z.ZodType>(
	item: T
): z.ZodObject<{
	content: z.ZodArray<T>;
	page: typeof pageTotalSchema;
}> => z.object({ content: z.array(item), page: pageTotalSchema });

/** One page of a list and how many rows match in all. */
export type ListPage<T> = { items: Array<T>; total: number };
