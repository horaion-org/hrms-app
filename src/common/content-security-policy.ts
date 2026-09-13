/**
 * Builds the Content-Security-Policy for one environment. Consumed by
 * vite.config.ts, never by the app: in development it becomes a response
 * header on the dev server, in production a meta tag in the built page.
 * See docs/adr/0007-content-security-policy.md.
 */

export type ContentSecurityPolicyOptions = {
	/** Origin of the Horaion API, e.g. `https://api.example.com`. */
	apiOrigin: string;
	/** AWS region of the Cognito user pool, e.g. `ap-southeast-1`. */
	cognitoRegion: string;
	/**
	 * Present only on the dev server. Vite stamps it on the script and style
	 * tags it injects for hot reload, so those can run without `unsafe-inline`.
	 */
	nonce?: string;
};

function origin(url: string): string {
	return new URL(url).origin;
}

export function contentSecurityPolicy(
	options: ContentSecurityPolicyOptions
): string {
	const nonce = options.nonce === undefined ? [] : [`'nonce-${options.nonce}'`];
	const development = options.nonce !== undefined;

	const directives: Array<[string, Array<string>]> = [
		["default-src", ["'self'"]],
		["script-src", ["'self'", ...nonce]],
		["style-src", ["'self'", ...nonce]],
		["img-src", ["'self'", "data:"]],
		["font-src", ["'self'"]],
		[
			"connect-src",
			[
				"'self'",
				origin(options.apiOrigin),
				`https://cognito-idp.${options.cognitoRegion}.amazonaws.com`,
				// Hot reload talks over a websocket to whichever host serves dev.
				...(development ? ["ws:", "wss:"] : []),
			],
		],
		["object-src", ["'none'"]],
		["base-uri", ["'none'"]],
		["form-action", ["'self'"]],
		["frame-src", ["'none'"]],
		["manifest-src", ["'self'"]],
	];

	const rendered = directives.map(
		([name, sources]) => `${name} ${sources.join(" ")}`
	);

	if (!development) {
		rendered.push("upgrade-insecure-requests");
	}

	return rendered.join("; ");
}
