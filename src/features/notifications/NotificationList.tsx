import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { useNow } from "@/common/useNow";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Pagination } from "@/components/ui/Pagination";
import {
	markNotificationsRead,
	notificationPageQuery,
	type NotificationAudience,
} from "@/features/notifications/api";
import {
	describeNotificationType,
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
	const read = useMutation({
		meta: { successMessage: false },
		mutationFn: (id: string | undefined) =>
			markNotificationsRead(companyId, audience, id),
		onSuccess: async () => {
			await client.invalidateQueries({
				queryKey: ["notifications", companyId, membershipId],
			});
		},
	});
	if (!allowed) return <p>{t("notifications.reviewUnavailable")}</p>;
	return (
		<div>
			{!compact && (
				<div className="my-6 flex flex-wrap items-center justify-between gap-4">
					<Checkbox
						checked={unreadOnly}
						label={t("notifications.unreadOnly")}
						onChange={(event) => {
							setUnreadOnly(event.target.checked);
							setPage(1);
						}}
					/>
					<Button
						disabled={read.isPending || !list.isSuccess || list.isError}
						variant="secondary"
						onClick={() => {
							read.mutate(undefined);
						}}
					>
						{t("notifications.markAllRead")}
					</Button>
				</div>
			)}
			{read.isError && (
				<p className="text-error-700" role="alert">
					{t("notifications.readFailed")}
				</p>
			)}
			{list.isError ? (
				<p role="alert">{t("notifications.failed")}</p>
			) : !list.data ? (
				<p>{t("notifications.loading")}</p>
			) : list.data.content.length === 0 ? (
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
						{list.data.content.map((notification) => {
							const title = t(
								describeNotificationType(notification.type).title
							);
							const target = leaveRequestTarget(notification, audience);
							const titleClasses = `text-ink-blue-900 ${notification.readAt ? "" : "font-semibold"}`;
							return (
								<li key={notification.notificationId}>
									<NotificationRow
										busy={read.isPending}
										notification={notification}
										now={now}
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
							total={list.data.page.totalElements}
							onPageChange={setPage}
						/>
					)}
				</>
			)}
		</div>
	);
};
