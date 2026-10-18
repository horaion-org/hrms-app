import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CountBadge } from "@/components/ui/CountBadge";
import { CloseIcon, NotificationIcon } from "@/components/ui/Icon";
import { notificationCountQuery } from "@/features/notifications/api";
import { NotificationViews } from "@/features/notifications/NotificationViews";
import { NotificationDemo } from "@/features/notifications/NotificationDemo";
import {
	useCurrentCompanyId,
	useCurrentMembershipId,
} from "@/features/organisation/useCurrentCompanyId";
import { useAccess } from "@/features/workspace/useAccess";

export const NotificationBell = (): FunctionComponent => {
	const titleId = useId();
	const [showDemo, setShowDemo] = useState(false);
	const demo = import.meta.env.DEV && showDemo;
	const companyId = useCurrentCompanyId();
	const membershipId = useCurrentMembershipId();
	const access = useAccess();
	const canReview = access.canAnywhere("leave_request:review");
	const personal = useQuery(
		notificationCountQuery(companyId, membershipId, "PERSONAL")
	);
	const review = useQuery(
		notificationCountQuery(companyId, membershipId, "REVIEW", canReview)
	);
	const { t } = useTranslation();
	const known =
		personal.isSuccess &&
		!personal.isError &&
		access.status === "ready" &&
		(!canReview || (review.isSuccess && !review.isError));
	const count = known
		? personal.data.unreadCount +
			(canReview ? (review.data?.unreadCount ?? 0) : 0)
		: undefined;
	return (
		<Popover
			key={`${companyId}:${membershipId}`}
			className="relative inline-flex"
		>
			<PopoverButton
				aria-haspopup="dialog"
				as={Button}
				className="relative h-12 w-12 data-open:bg-ink-blue-50 [&>svg]:size-8 [&>svg]:text-ink-blue-900 hover:[&>svg]:text-ink-blue-700"
				variant="icon"
				aria-label={
					count === undefined
						? t("notifications.countUnavailable")
						: t("notifications.unreadCount", { count })
				}
			>
				<NotificationIcon />
				<CountBadge
					aria-hidden="true"
					className="absolute -right-1 -top-1"
					count={count}
					tone="active"
				/>
			</PopoverButton>
			<PopoverPanel
				focus
				anchor="bottom end"
				aria-labelledby={titleId}
				className="z-60 flex max-h-[min(36rem,calc(100dvh-2rem))] w-120 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-neutral-300 bg-white text-neutral-900 shadow-xl outline-none [--anchor-gap:8px] [--anchor-padding:16px]"
				role="dialog"
			>
				{({ close }) => (
					<>
						<header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
							<h2 className="text-lg font-semibold" id={titleId}>
								{t("notifications.title")}
							</h2>
							<Button
								aria-label={t("notifications.closePanel")}
								variant="icon"
								onClick={() => {
									close();
								}}
							>
								<CloseIcon />
							</Button>
						</header>
						<div className="min-h-0 overflow-y-auto p-5">
							{import.meta.env.DEV && (
								<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
									{demo && (
										<Badge tone="warning">{t("notifications.demoLabel")}</Badge>
									)}
									<Button
										variant="textlink"
										onClick={() => {
											setShowDemo(!showDemo);
										}}
									>
										{t(
											demo ? "notifications.showLive" : "notifications.showDemo"
										)}
									</Button>
								</div>
							)}
							{demo ? (
								<NotificationDemo />
							) : (
								<NotificationViews
									compact
									onNavigate={() => {
										close();
									}}
								/>
							)}
						</div>
						<footer className="shrink-0 border-t border-neutral-200 px-5 py-4">
							<Link
								className="block text-center text-sm font-medium text-ink-blue-900 underline underline-offset-2"
								to="/notifications"
								onClick={() => {
									close();
								}}
							>
								{t("notifications.viewAll")}
							</Link>
						</footer>
					</>
				)}
			</PopoverPanel>
		</Popover>
	);
};
