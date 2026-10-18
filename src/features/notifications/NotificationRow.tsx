import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import type { InboxNotification } from "@/features/notifications/api";

/** The same presentation is used in the inbox and dashboard; the caller supplies its typed target link. */
export const NotificationRow = ({
	notification,
	children,
	busy = false,
	onRead,
}: {
	notification: InboxNotification;
	children: ReactNode;
	busy?: boolean;
	onRead: () => void;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	return (
		<div className="grid grid-cols-[0.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 py-4 sm:grid-cols-[0.5rem_minmax(0,1fr)_auto]">
			<span
				aria-hidden="true"
				className={`mt-2 size-2 rounded-full ${notification.readAt ? "invisible" : "bg-error-600"}`}
			/>
			<div className="min-w-0">
				{children}
				{!notification.readAt && (
					<span className="sr-only">{t("notifications.unread")}</span>
				)}
				<time
					className="mt-1 block text-xs text-neutral-700"
					dateTime={notification.occurredAt}
				>
					{new Intl.DateTimeFormat(i18n.language, {
						dateStyle: "medium",
						timeStyle: "short",
					}).format(new Date(notification.occurredAt))}
				</time>
			</div>
			{!notification.readAt && (
				<Button
					className="col-start-2 justify-self-start sm:col-start-3 sm:justify-self-end"
					disabled={busy}
					variant="textlink"
					onClick={onRead}
				>
					{t("notifications.markRead")}
				</Button>
			)}
		</div>
	);
};
