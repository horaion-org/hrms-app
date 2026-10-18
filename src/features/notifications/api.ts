import {
	queryOptions,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { companyPath } from "@/features/organisation/api";
import {
	administrativeMeta,
	selfMeta,
	type QueryAccessMeta,
} from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

export type NotificationAudience = "PERSONAL" | "REVIEW";

export const notificationSchema = z.object({
	notificationId: z.string(),
	type: z.enum([
		"LEAVE_REQUEST_SUBMITTED",
		"LEAVE_REQUEST_APPROVED",
		"LEAVE_REQUEST_REJECTED",
	]),
	leaveRequestId: z.string(),
	membershipId: z.string(),
	occurredAt: z.iso.datetime({ offset: true }),
	createdAt: z.iso.datetime({ offset: true }),
	readAt: z.iso
		.datetime({ offset: true })
		.nullish()
		.transform((value) => value ?? null),
});
export type InboxNotification = z.infer<typeof notificationSchema>;

const pageSchema = z.object({
	content: z.array(notificationSchema),
	page: z.object({ totalElements: z.number().int().nonnegative() }),
});
const countSchema = z.object({ unreadCount: z.number().int().nonnegative() });
const readSchema = z.object({ updatedCount: z.number().int().nonnegative() });
type NotificationPage = z.infer<typeof pageSchema>;
type NotificationCount = z.infer<typeof countSchema>;

const base = (companyId: string): string =>
	`${companyPath(companyId)}/me/notifications`;
const meta = (
	companyId: string,
	audience: NotificationAudience
): QueryAccessMeta =>
	audience === "PERSONAL" ? selfMeta(companyId) : administrativeMeta(companyId);

export const notificationPageQuery = (
	companyId: string,
	membershipId: string,
	audience: NotificationAudience,
	page: number,
	unreadOnly: boolean,
	enabled: boolean,
	size = 20
): UndefinedInitialDataOptions<
	NotificationPage,
	Error,
	NotificationPage,
	readonly [
		"notifications",
		string,
		string,
		NotificationAudience,
		"page",
		number,
		boolean,
		number,
	]
> =>
	queryOptions({
		queryKey: [
			"notifications",
			companyId,
			membershipId,
			audience,
			"page",
			page,
			unreadOnly,
			size,
		] as const,
		queryFn: ({ signal }) =>
			apiRequest(
				`${base(companyId)}?${new URLSearchParams({ audience, page: String(page - 1), size: String(size), unreadOnly: String(unreadOnly) })}`,
				pageSchema,
				{ signal, responseFormat: "record" }
			),
		meta: meta(companyId, audience),
		enabled: enabled && !!companyId && !!membershipId,
		staleTime: 30_000,
		refetchInterval: 30_000,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		retry,
	});

export const notificationCountQuery = (
	companyId: string,
	membershipId: string,
	audience: NotificationAudience,
	enabled = true
): UndefinedInitialDataOptions<
	NotificationCount,
	Error,
	NotificationCount,
	readonly ["notifications", string, string, NotificationAudience, "count"]
> =>
	queryOptions({
		queryKey: [
			"notifications",
			companyId,
			membershipId,
			audience,
			"count",
		] as const,
		queryFn: ({ signal }) =>
			apiRequest(
				`${base(companyId)}/unread-count?audience=${audience}`,
				countSchema,
				{
					signal,
					responseFormat: "record",
				}
			),
		meta: meta(companyId, audience),
		enabled: enabled && !!companyId && !!membershipId,
		staleTime: 30_000,
		refetchInterval: 30_000,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		retry,
	});

export const markNotificationsRead = (
	companyId: string,
	audience: NotificationAudience,
	notificationId?: string
): Promise<z.infer<typeof readSchema>> =>
	apiRequest(
		`${base(companyId)}/${notificationId ? `${encodeURIComponent(notificationId)}/read` : "read-all"}?audience=${audience}`,
		readSchema,
		{ method: "PUT", responseFormat: "record" }
	);
