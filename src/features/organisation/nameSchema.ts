import { z } from "zod";

/** The fewest characters a name may have, as the API's name rule says. */
export const NAME_MIN_LENGTH = 2;

/** The most characters a name may have, as the API's name rule says. */
export const NAME_MAX_LENGTH = 100;

/** The name limits, as the texts that state them take them ("{{min}}–{{max}} characters"). */
export const NAME_LIMITS = { min: NAME_MIN_LENGTH, max: NAME_MAX_LENGTH };

/**
 * The name rule the API shares across Branches and access roles:
 * `NAME_MIN_LENGTH` to `NAME_MAX_LENGTH` letters, numbers, spaces and . ' & -. Uniqueness remains a server decision.
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
		.min(NAME_MIN_LENGTH, messages.length)
		.max(NAME_MAX_LENGTH, messages.length)
		.regex(/^[\p{L}\p{N} .'&-]+$/u, messages.characters);
