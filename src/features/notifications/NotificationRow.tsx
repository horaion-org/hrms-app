import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import type { InboxNotification } from "@/features/notifications/api";
import {
	notificationExactTime,
	notificationTimeLabel,
} from "@/features/notifications/notificationTime";
import {
	describeNotificationType,
	type NotificationTone,
} from "@/features/notifications/notificationTypes";

const toneClasses: Record<NotificationTone, string> = {
	info: "bg-ink-blue-100 text-ink-blue-900",
	success: "bg-success-100 text-success-900",
	warning: "bg-warning-100 text-warning-900",
	error: "bg-error-100 text-error-900",
	neutral: "bg-neutral-200 text-neutral-800",
};

/**
 * One inbox entry: type icon and colour, category, time, the caller's title (a typed link or plain text) and Mark
 * as read.
 */
export const NotificationRow = ({
	notification,
	now,
	children,
	busy = false,
	onRead,
}: {
	notification: InboxNotification;
	now: Date;
	children: ReactNode;
	busy?: boolean;
	onRead: () => void;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const type = describeNotificationType(notification.type);
	const Icon = type.icon;
	const unread = !notification.readAt;
	return (
		<div className="grid grid-cols-[0.5rem_auto_minmax(0,1fr)_auto] items-start gap-x-3 py-4">
			<span
				aria-hidden="true"
				className={`mt-4 size-2 rounded-full ${unread ? "bg-ink-blue-900" : "invisible"}`}
			/>
			<span
				aria-hidden="true"
				className={`flex size-10 items-center justify-center rounded-sm ${toneClasses[type.tone]}`}
			>
				<Icon className="size-6" />
			</span>
			<div className="min-w-0">
				<p className="text-xs text-neutral-700">
					<span className="font-medium uppercase">
						{t(`notifications.categories.${type.category}`)}
					</span>
					<span aria-hidden="true" className="mx-2">
						•
					</span>
					<time
						dateTime={notification.occurredAt}
						title={notificationExactTime(
							notification.occurredAt,
							i18n.language
						)}
					>
						{notificationTimeLabel(
							notification.occurredAt,
							now,
							i18n.language
						) ?? t("notifications.justNow")}
					</time>
				</p>
				<div className="mt-1">{children}</div>
				{unread && <span className="sr-only">{t("notifications.unread")}</span>}
			</div>
			{unread && (
				<Button disabled={busy} variant="textlink" onClick={onRead}>
					{t("notifications.markRead")}
				</Button>
			)}
		</div>
	);
};
