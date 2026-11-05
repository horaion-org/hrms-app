import { ApiProblemError } from "@/common/problem";

/** The refusals every spreadsheet import shares, whatever else its API can refuse. */
type SharedImportRefusal =
	"UNSUPPORTED_FILE" | "FILE_TOO_LARGE" | "RATE_LIMITED" | "UNKNOWN";

/** What the server accepts as an import file. */
export type ImportFileRules = {
	extensions: ReadonlyArray<string>;
	maxBytes: number;
};

/**
 * A file the browser can already tell the API would refuse, by its extension
 * or its size, so it is never uploaded. The server checks both again.
 */
export const importFileProblem = (
	file: File,
	rules: ImportFileRules
): "UNSUPPORTED_FILE" | "FILE_TOO_LARGE" | undefined => {
	const name = file.name.toLowerCase();
	if (!rules.extensions.some((extension) => name.endsWith(extension)))
		return "UNSUPPORTED_FILE";
	if (file.size > rules.maxBytes) return "FILE_TOO_LARGE";
	return undefined;
};

/**
 * Why the API refused a file or an import, as one of the import's own codes
 * the copy is keyed on. A 413 or 429 that carries no known code still gets
 * its own sentence; anything else is UNKNOWN.
 */
export const importRefusalCode = <Code extends string>(
	error: unknown,
	knownCodes: ReadonlyArray<Code | SharedImportRefusal>
): Code | SharedImportRefusal => {
	if (error instanceof ApiProblemError) {
		const known = knownCodes.find((code) => code === error.errorCode);
		if (known !== undefined) return known;
		if (error.status === 413) return "FILE_TOO_LARGE";
		if (error.status === 429) return "RATE_LIMITED";
	}
	return "UNKNOWN";
};
