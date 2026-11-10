/** A date format in `timeZone` (an IANA name); the browser's own zone when the name is unknown. */
export const dateTimeFormatIn = (
	language: string,
	timeZone: string,
	options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat => {
	try {
		return new Intl.DateTimeFormat(language, { ...options, timeZone });
	} catch {
		return new Intl.DateTimeFormat(language, options);
	}
};
