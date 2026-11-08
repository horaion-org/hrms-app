import type { ReactNode, Ref } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { DeleteIcon, TickIcon } from "@/components/ui/Icon";
import type { InboxNotification } from "@/features/notifications/api";
import {
	notificationExactTime,
	notificationTimeLabel,
} from "@/features/notifications/notificationTime";
import {
	presentNotification,
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
 * One inbox entry: type icon and colour, category, time, the caller's title (a typed link or plain text), the
 * remark when the notification carries one (a roster change or withdrawal, a leave decision or change), and the
 * entry's actions. Actions are always
 * shown, never revealed on hover, so touch and keyboard users reach them.
 */
export const NotificationRow = ({
	notification,
	now,
	children,
	compact = false,
	busy = false,
	onRead,
	onDelete,
	deleteRef,
}: {
	notification: InboxNotification;
	now: Date;
	children: ReactNode;
	compact?: boolean;
	busy?: boolean;
	onRead: () => void;
	/** Absent where entries cannot be deleted, such as the development demo. */
	onDelete?: () => void;
	/** Lets the list move focus here after a neighbouring entry is deleted. */
	deleteRef?: Ref<HTMLButtonElement>;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const type = presentNotification(notification);
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
							formattingLocale(i18n)
						)}
					>
						{notificationTimeLabel(
							notification.occurredAt,
							now,
							formattingLocale(i18n)
						) ?? t("notifications.justNow")}
					</time>
				</p>
				<div className="mt-1">{children}</div>
				{notification.remark && (
					<p className="mt-1 text-sm text-neutral-800">
						{t("notifications.remark")}{" "}
						<q className="break-words">{notification.remark}</q>
					</p>
				)}
				{unread && <span className="sr-only">{t("notifications.unread")}</span>}
			</div>
			<div className="flex items-center gap-1">
				{unread &&
					(compact ? (
						<Button
							aria-label={t("notifications.markRead")}
							disabled={busy}
							title={t("notifications.markRead")}
							variant="icon"
							onClick={onRead}
						>
							<TickIcon />
						</Button>
					) : (
						<Button disabled={busy} variant="textlink" onClick={onRead}>
							{t("notifications.markRead")}
						</Button>
					))}
				{onDelete && (
					<Button
						ref={deleteRef}
						aria-label={t("notifications.delete")}
						disabled={busy}
						title={t("notifications.delete")}
						variant="icon"
						onClick={onDelete}
					>
						<DeleteIcon />
					</Button>
				)}
			</div>
		</div>
	);
};
