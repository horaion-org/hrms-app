import { z } from "zod";

/**
 * The name rule the API shares across Branches and access roles: 2 to 100
 * letters, numbers, spaces and . ' & -. Uniqueness remains a server decision.
 */
export const nameSchema = (messages: {
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
		.regex(/^[\p{L}\p{N} .'&-]+$/u, messages.characters);
