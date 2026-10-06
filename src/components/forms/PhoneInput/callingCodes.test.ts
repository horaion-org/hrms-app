import { describe, expect, it } from "vitest";
import {
	callingCodes,
	primaryRegions,
} from "@/components/forms/PhoneInput/callingCodes";
import { countryCodes } from "@/common/countries";

describe("calling codes", () => {
	it("covers exactly the regions of the country list", () => {
		expect(Object.keys(callingCodes).sort()).toEqual([...countryCodes].sort());
	});

	it("writes every code as a plus and up to four digits, never starting with 0", () => {
		for (const code of Object.values(callingCodes))
			expect(code).toMatch(/^\+[1-9]\d{0,3}$/);
	});

	it.each([
		["SG", "+65"],
		["MY", "+60"],
		["ID", "+62"],
		["PH", "+63"],
		["TH", "+66"],
		["VN", "+84"],
		["IN", "+91"],
		["CN", "+86"],
		["HK", "+852"],
		["JP", "+81"],
		["KR", "+82"],
		["AU", "+61"],
		["NZ", "+64"],
		["GB", "+44"],
		["US", "+1"],
		["CA", "+1"],
		["DE", "+49"],
		["FR", "+33"],
		["AE", "+971"],
		["SA", "+966"],
		["RU", "+7"],
		["KZ", "+7"],
		["TW", "+886"],
		["MO", "+853"],
		["BR", "+55"],
		["ZA", "+27"],
		["PR", "+1"],
		["JE", "+44"],
		["FI", "+358"],
		["IE", "+353"],
	])("gives %s the code %s", (region, code) => {
		expect(callingCodes[region]).toBe(code);
	});

	it("names a primary region with that code for every shared code", () => {
		const regionsByCode = new Map<string, Array<string>>();
		for (const [region, code] of Object.entries(callingCodes))
			regionsByCode.set(code, [...(regionsByCode.get(code) ?? []), region]);
		const shared = [...regionsByCode]
			.filter(([, regions]) => regions.length > 1)
			.map(([code]) => code)
			.sort();
		expect(Object.keys(primaryRegions).sort()).toEqual(shared);
		for (const [code, region] of Object.entries(primaryRegions))
			expect(callingCodes[region]).toBe(code);
	});

	it("has no code that begins another, as E.164 codes never do", () => {
		const codes = [...new Set(Object.values(callingCodes))];
		for (const code of codes)
			expect(
				codes.filter((other) => other !== code && other.startsWith(code))
			).toEqual([]);
	});
});
