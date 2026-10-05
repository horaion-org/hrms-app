import { z } from "zod";
import { companyMemberSchema } from "@/features/organisation/api";

/** The API's allow-list for unit names (Branch, Department, Job title, System role). */
export const UNIT_NAME_PATTERN = /^[\p{L}\p{N} .'&-]+$/u;

/** The most heads one create request may name. */
export const MAX_HEADS = 20;

/** Mirrors the server's name rule; uniqueness remains a server decision. */
export const unitNameSchema = (messages: {
	required: string;
	length: string;
	characters: string;
}): z.ZodString =>
	z
		.string()
		.trim()
		.min(1, messages.required)
		.min(2, messages.length)
		.max(100, messages.length)
		.regex(UNIT_NAME_PATTERN, messages.characters);

/** One to twenty chosen people, each an active company member. */
export const headsSchema = (messages: {
	required: string;
	max: string;
}): z.ZodArray<typeof companyMemberSchema> =>
	z
		.array(companyMemberSchema)
		.min(1, messages.required)
		.max(MAX_HEADS, messages.max);
