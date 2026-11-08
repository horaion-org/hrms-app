import { z } from "zod";

const searchSchema = z.object({
	/** The offer a notification opened the roster for: its card shows whatever its status. */
	offer: z.string().min(1).optional().catch(undefined),
});

/** The offer a link names on the member's roster page (`?offer=`). */
export type OfferSearch = z.infer<typeof searchSchema>;

/** Reads the URL's offer, dropping anything it does not recognise. */
export const parseOfferSearch = (
	search: Record<string, unknown>
): OfferSearch => {
	const { offer } = searchSchema.parse(search);
	return offer === undefined ? {} : { offer };
};
