import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { Decorator } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { authTestI18n } from "@/features/auth/testingI18n";

/** One stubbed GET for stories: the path fragment it answers and its rows. */
export type StoryList = { path: string; content: Array<unknown> };

const json = (body: unknown, status: number): Response =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});

const urlOf = (input: RequestInfo | URL): string =>
	typeof input === "string"
		? input
		: input instanceof URL
			? input.href
			: input.url;

/**
 * Stubs the API for a create Dialog story: each GET answers the first list
 * whose `path` it contains, and every POST either stays pending (`pending`
 * parameter) or fails with a 500 so the form-level alert shows.
 */
export const stubStoryApi = (
	lists: Array<StoryList>,
	pending: boolean,
	client: QueryClient
): (() => void) => {
	const original = globalThis.fetch;
	configureApiClient({
		accessToken: () => Promise.resolve("story-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
	globalThis.fetch = (input, init): Promise<Response> => {
		if (init?.method === "POST")
			return pending
				? new Promise<Response>(() => {})
				: Promise.resolve(
						json({ status: 500, errorCode: "INTERNAL_ERROR" }, 500)
					);
		const list = lists.find(({ path }) => urlOf(input).includes(path));
		if (list)
			return Promise.resolve(
				json(
					{
						success: true,
						message: "OK",
						path: "/",
						timestamp: "2026-09-27T00:00:00Z",
						data: {
							content: list.content,
							page: { totalElements: list.content.length },
						},
					},
					200
				)
			);
		return original(input, init);
	};
	return (): void => {
		globalThis.fetch = original;
		resetApiClient();
		client.clear();
	};
};

/** English copy and a query client for a Dialog story. */
export const storyProviders =
	(client: QueryClient): Decorator =>
	(Story) => (
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<Story />
			</QueryClientProvider>
		</I18nextProvider>
	);

export const STORY_PEOPLE = ["Marcus Lim", "Priya Nair", "Daniel Tan"].map(
	(displayName, index) => ({
		membershipId: `member-${index}`,
		displayName,
		status: "ACTIVE",
	})
);
