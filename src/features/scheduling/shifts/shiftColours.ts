/*
 * The colours a shift may be given, in the order the picker shows them: two
 * rows of ten. The API keeps only the hex; the names are for assistive
 * technology, through `scheduling.shiftColours.<key>`.
 */
export const SHIFT_COLOURS = [
	{ key: "terracotta", value: "#D4683F" },
	{ key: "peach", value: "#E0B08A" },
	{ key: "orange", value: "#E9A55A" },
	{ key: "rosyBrown", value: "#C5A196" },
	{ key: "sand", value: "#E3C77B" },
	{ key: "olive", value: "#8E9A3B" },
	{ key: "lime", value: "#D1DC6A" },
	{ key: "sage", value: "#AFCF9E" },
	{ key: "green", value: "#6E9E7E" },
	{ key: "mint", value: "#9CD9C6" },
	{ key: "teal", value: "#4F9A82" },
	{ key: "skyBlue", value: "#8DB5EA" },
	{ key: "steelBlue", value: "#7F9BB8" },
	{ key: "slate", value: "#6E72A5" },
	{ key: "purple", value: "#8A6CA6" },
	{ key: "lilac", value: "#C9A8D8" },
	{ key: "orchid", value: "#C878B4" },
	{ key: "maroon", value: "#A94F62" },
	{ key: "pink", value: "#E0A3B6" },
	{ key: "grey", value: "#BDBAB3" },
] as const;

export type ShiftColourKey = (typeof SHIFT_COLOURS)[number]["key"];
