/**
 * Control characters and whitespace have no place in a path this app links
 * to, and browsers strip some of them (tab, newline) before parsing, which
 * could turn `/\t/evil.test` into the protocol-relative `//evil.test`.
 */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_OR_WHITESPACE = /[\u0000-\u001f\u007f-\u009f\s]/u;

/**
 * The page to open after signing in: a `?redirect=` path within this app,
 * or home. Anything else (another origin, a protocol-relative URL, a path
 * with control characters or whitespace) is ignored so the parameter cannot
 * send a person off-site.
 */
export function returnPath(value: unknown): string {
	if (
		typeof value !== "string" ||
		!value.startsWith("/") ||
		value.startsWith("//") ||
		value.startsWith("/\\") ||
		CONTROL_OR_WHITESPACE.test(value)
	) {
		return "/";
	}

	return value;
}
