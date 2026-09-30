/** Accept a path within this origin, refusing browser-normalised authority tricks. */
export function returnPath(value: unknown): string {
	if (
		typeof value !== "string" ||
		!value.startsWith("/") ||
		value.startsWith("//") ||
		value.includes("\\")
	)
		return "/";
	if (
		Array.from(value).some((character) => {
			const code = character.charCodeAt(0);
			return code < 32 || (code >= 127 && code <= 159) || /\s/u.test(character);
		})
	)
		return "/";
	// Dot segments may normalise a path into a leading double slash.
	const parsed = new URL(value, "https://horaion.invalid");
	return parsed.origin === "https://horaion.invalid" &&
		!parsed.pathname.startsWith("//")
		? value
		: "/";
}
