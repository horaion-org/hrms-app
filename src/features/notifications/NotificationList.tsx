import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { useNow } from "@/common/useNow";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Pagination } from "@/components/ui/Pagination";
import {
	deleteNotification,
	markNotificationsRead,
	notificationCountQuery,
	notificationPageQuery,
	type InboxNotification,
	type NotificationAudience,
} from "@/features/notifications/api";
import {
	presentNotification,
	leaveRequestTarget,
} from "@/features/notifications/notificationTypes";
import {
	useCurrentCompanyId,
	useCurrentMembershipId,
} from "@/features/organisation/useCurrentCompanyId";
import { useAccess } from "@/features/workspace/useAccess";
import { accessiblePreviousData } from "@/features/workspace/queryAccess";
import { NotificationRow } from "@/features/notifications/NotificationRow";

const ONE_MINUTE_MS = 60_000;

/** A notification that is already gone (deleted elsewhere, or no longer visible) needs no error. */
const ignoreAlreadyGone = (error: unknown): void => {
	if (!(error instanceof ApiProblemError && error.status === 404)) throw error;
};

export const NotificationList = ({
	audience,
	compact = false,
	onNavigate,
}: {
	audience: NotificationAudience;
	compact?: boolean;
	onNavigate?: () => void;
}): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const membershipId = useCurrentMembershipId();
	const access = useAccess();
	const allowed =
		audience === "PERSONAL" || access.canAnywhere("leave_request:review");
	const { t } = useTranslation();
	const now = useNow(ONE_MINUTE_MS);
	const [page, setPage] = useState(1);
	const [unreadOnly, setUnreadOnly] = useState(false);
	const size = compact ? 5 : 20;
	const client = useQueryClient();
	const listRef = useRef<HTMLDivElement>(null);
	const deleteButtons = useRef(new Map<string, HTMLButtonElement>());
	const pendingFocus = useRef<{ deletedId: string; index: number }>(undefined);
	const list = useQuery({
		...notificationPageQuery(
			companyId,
			membershipId,
			audience,
			page,
			unreadOnly,
			allowed,
			size
		),
		// Only retain pages for this exact identity/audience/filter; never across a company switch.
		placeholderData: (previous, query) => {
			const key = query?.queryKey;
			if (
				key?.[1] !== companyId ||
				key[2] !== membershipId ||
				key[3] !== audience ||
				key[6] !== unreadOnly
			)
				return undefined;
			return audience === "REVIEW"
				? accessiblePreviousData()(previous, query)
				: previous;
		},
	});
	const unread = useQuery(
		notificationCountQuery(
			companyId,
			membershipId,
			audience,
			allowed && compact
		)
	);
	const refresh = (): Promise<void> =>
		client.invalidateQueries({
			queryKey: ["notifications", companyId, membershipId],
		});
	const read = useMutation({
		meta: { successMessage: false },
		mutationFn: (id: string | undefined) =>
			markNotificationsRead(companyId, audience, id),
		onSuccess: refresh,
	});
	const remove = useMutation({
		meta: { successMessage: "notifications.deleted" },
		mutationFn: (id: string) =>
			deleteNotification(companyId, audience, id).catch(ignoreAlreadyGone),
		onSuccess: refresh,
	});
	const rows = list.data?.content;

	// After a delete, keep keyboard focus in the list: the entry that took its place, the one above, or the list.
	useEffect(() => {
		const pending = pendingFocus.current;
		if (
			!pending ||
			!rows ||
			rows.some((row) => row.notificationId === pending.deletedId)
		)
			return;
		pendingFocus.current = undefined;
		const next = rows[Math.min(pending.index, rows.length - 1)];
		const button = next && deleteButtons.current.get(next.notificationId);
		if (button) button.focus();
		else listRef.current?.focus();
	}, [rows]);

	const deleteRow = (notification: InboxNotification, index: number): void => {
		const emptiesPage = rows?.length === 1 && page > 1;
		pendingFocus.current = { deletedId: notification.notificationId, index };
		remove.mutate(notification.notificationId, {
			onSuccess: () => {
				if (emptiesPage) setPage(page - 1);
			},
			onError: () => {
				pendingFocus.current = undefined;
			},
		});
	};

	if (!allowed) return <p>{t("notifications.reviewUnavailable")}</p>;
	const busy = read.isPending || remove.isPending;
	const markAllRead = (
		<Button
			disabled={busy || !list.isSuccess || list.isError}
			variant={compact ? "textlink" : "secondary"}
			onClick={() => {
				read.mutate(undefined);
			}}
		>
			{t("notifications.markAllRead")}
		</Button>
	);
	return (
		<div ref={listRef} className="outline-none" tabIndex={-1}>
			{compact ? (
				(unread.data?.unreadCount ?? 0) > 0 && (
					<div className="mt-3 flex justify-end">{markAllRead}</div>
				)
			) : (
				<div className="my-6 flex flex-wrap items-center justify-between gap-4">
					<Checkbox
						checked={unreadOnly}
						label={t("notifications.unreadOnly")}
						onChange={(event) => {
							setUnreadOnly(event.target.checked);
							setPage(1);
						}}
					/>
					{markAllRead}
				</div>
			)}
			{read.isError && (
				<p className="text-error-700" role="alert">
					{t("notifications.readFailed")}
				</p>
			)}
			{remove.isError && (
				<p className="text-error-700" role="alert">
					{t("notifications.deleteFailed")}
				</p>
			)}
			{list.isError ? (
				<p role="alert">{t("notifications.failed")}</p>
			) : !rows ? (
				<p>{t("notifications.loading")}</p>
			) : rows.length === 0 ? (
				<div className="px-4 py-10 text-center text-sm text-neutral-700">
					<p>{t("notifications.empty")}</p>
					{page > 1 && (
						<Button
							className="mt-4"
							variant="textlink"
							onClick={() => {
								setPage(1);
							}}
						>
							{t("notifications.firstPage")}
						</Button>
					)}
				</div>
			) : (
				<>
					<ul className="divide-y divide-neutral-300">
						{rows.map((notification, index) => {
							const presentation = presentNotification(notification);
							const title = t(presentation.title, presentation.values);
							const target = leaveRequestTarget(notification, audience);
							const titleClasses = `text-ink-blue-900 ${notification.readAt ? "" : "font-semibold"}`;
							return (
								<li key={notification.notificationId}>
									<NotificationRow
										busy={busy}
										compact={compact}
										notification={notification}
										now={now}
										deleteRef={(element) => {
											if (element)
												deleteButtons.current.set(
													notification.notificationId,
													element
												);
											else
												deleteButtons.current.delete(
													notification.notificationId
												);
										}}
										onDelete={() => {
											deleteRow(notification, index);
										}}
										onRead={() => {
											read.mutate(notification.notificationId);
										}}
									>
										{target ? (
											<Link
												className={`${titleClasses} hover:underline`}
												search={target}
												to="/leave"
												onClick={onNavigate}
											>
												{title}
											</Link>
										) : (
											<span className={titleClasses}>{title}</span>
										)}
									</NotificationRow>
								</li>
							);
						})}
					</ul>
					{!compact && (
						<Pagination
							page={page}
							pageSize={size}
							total={list.data?.page.totalElements ?? 0}
							onPageChange={setPage}
						/>
					)}
				</>
			)}
		</div>
	);
};
