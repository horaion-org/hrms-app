import dayjs from "dayjs";

/** An ISO date as a short day in the person's language, e.g. "Mon, 12 Oct". */
export const formatDay = (date: string, language: string): string =>
	new Intl.DateTimeFormat(language, {
		weekday: "short",
		day: "numeric",
		month: "short",
	}).format(dayjs(date).toDate());
