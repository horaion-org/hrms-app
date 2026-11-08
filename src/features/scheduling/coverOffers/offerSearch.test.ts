import { describe, expect, it } from "vitest";
import { parseOfferSearch } from "@/features/scheduling/coverOffers/offerSearch";

describe("parseOfferSearch", () => {
	it.each([
		[{ offer: "o-1" }, { offer: "o-1" }],
		[{ offer: "" }, {}],
		[{ offer: 7 }, {}],
		[{}, {}],
	] as const)("given_%o_when_read_then_%o", (search, parsed) => {
		expect(parseOfferSearch(search)).toEqual(parsed);
	});
});
