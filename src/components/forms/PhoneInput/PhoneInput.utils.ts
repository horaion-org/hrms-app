import {
	callingCodes,
	primaryRegions,
} from "@/components/forms/PhoneInput/callingCodes";

/** What the field shows: a chosen region (or none) and the national number as typed. */
export type PhoneParts = { region: string | null; national: string };

const knownRegion = (region?: string): string | null =>
	region && callingCodes[region] ? region : null;

const knownCodes = new Set(Object.values(callingCodes));

/** Calling codes are at most three digits; the longest known prefix wins. */
const longestCode = (digits: string): string | undefined =>
	[3, 2, 1]
		.map((length) => `+${digits.slice(0, length)}`)
		.find((code) => knownCodes.has(code));

/**
 * Splits an E.164 value for display. A code several regions share shows the
 * default country when it has that code, otherwise the code's primary region.
 * A value with no known code keeps every character in the number box, without
 * its leading "+", and chooses no region, so the person can correct it.
 */
export const parsePhone = (
	value: string,
	defaultCountry?: string
): PhoneParts => {
	const fallback = knownRegion(defaultCountry);
	if (value === "") return { region: fallback, national: "" };
	const digits = /^\+(\d+)$/.exec(value)?.[1];
	const code = digits === undefined ? undefined : longestCode(digits);
	if (digits === undefined || code === undefined)
		return { region: null, national: value.replace(/^\+/, "") };
	const region =
		fallback && callingCodes[fallback] === code
			? fallback
			: (primaryRegions[code] ??
				Object.keys(callingCodes).find(
					(candidate) => callingCodes[candidate] === code
				) ??
				null);
	return { region, national: digits.slice(code.length - 1) };
};

/**
 * The value the field reports: "" with no digits, E.164 with a region, and the
 * bare digits without one, which no E.164 rule accepts, so a form can ask for
 * the country code instead of losing what was typed.
 */
export const formatPhone = ({ region, national }: PhoneParts): string => {
	const digits = national.replace(/\s/g, "");
	if (digits === "") return "";
	const code = region ? callingCodes[region] : undefined;
	return code ? `${code}${digits}` : digits;
};
