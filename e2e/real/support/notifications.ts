import { ApiClient, rowsOf } from "./api";

/**
 * The caller's inbox, newest first: "For you" (PERSONAL, the route's default) or "Needs review" (REVIEW). The route
 * answers a bare page, not the `{success, data}` envelope (D-07).
 */
export async function notificationsOf(api: ApiClient, audience: "PERSONAL" | "REVIEW" = "PERSONAL"): Promise<any[]> {
	const answer = await api.get(`~/me/notifications?audience=${audience}&page=0&size=100`);
	return rowsOf(answer.data ?? answer.body);
}

/**
 * Waits for a notification of the type that matches, delivered after `since` (ISO instant). Delivery runs after the
 * transaction commits, so a notice may land a few seconds after the action that caused it.
 */
export async function waitForNotification(
	api: ApiClient,
	type: string,
	since: string,
	matches: (row: any) => boolean = () => true,
	timeoutMs = 30_000
): Promise<any | undefined> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		const found = (await notificationsOf(api)).find((row) => row.type === type && (row.createdAt ?? row.occurredAt ?? "") >= since && matches(row));
		if (found || Date.now() > deadline) return found;
		await new Promise((resolve) => setTimeout(resolve, 2_000));
	}
}
