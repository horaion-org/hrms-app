/** First letters of the first and last words, so "Jane Mary Tan" reads "JT". */
export const initialsOf = (name: string): string => {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const first = words[0];
	if (!first) return "";
	const last = words.length > 1 ? words[words.length - 1] : undefined;
	return [first, last]
		.map((word) => (word ? (Array.from(word)[0] ?? "") : ""))
		.join("")
		.toLocaleUpperCase();
};
