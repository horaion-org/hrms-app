import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChevronRightIcon } from "@/components/ui/Icon";

export type NotificationAction = {
	label: string;
	icon?: ReactNode;
	onClick?: () => void;
	disabled?: boolean;
};

export type NotificationItemProps = {
	/** What happened, in bold, e.g. "Annual leave request". */
	title: string;
	/** The rest of the sentence, e.g. "from John Lim (12–14 May)". */
	detail: string;
	/** Usually the positive answer, e.g. Approve. */
	primaryAction: NotificationAction;
	secondaryAction: NotificationAction;
	/** Opens the notification's subject; left out when there is nothing to open. */
	onOpen?: () => void;
	/** A short marker beside the title, e.g. "Example". */
	tag?: string;
	className?: string;
};

/** Something waiting on the person, with the two answers it usually gets. */
export const NotificationItem = ({
	title,
	detail,
	primaryAction,
	secondaryAction,
	onOpen,
	tag,
	className,
}: NotificationItemProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<div
			className={joinClassNames(
				"grid grid-cols-[0.5rem_minmax(0,1fr)_auto] gap-x-3 gap-y-4",
				className
			)}
		>
			<span
				aria-hidden="true"
				className="mt-2 size-2 rounded-full bg-ink-blue-900"
			/>
			<p className="w-full text-base font-medium text-neutral-900">
				<b className="font-bold">{title}</b> {detail}
				{tag && (
					<Badge className="ml-2 align-middle" tone="neutral">
						{tag}
					</Badge>
				)}
			</p>
			{onOpen ? (
				<Button
					aria-label={t("dashboard.notifications.open", { title })}
					className="size-6!"
					variant="icon"
					onClick={onOpen}
				>
					<ChevronRightIcon />
				</Button>
			) : (
				<span />
			)}
			<div className="col-span-3 flex flex-wrap gap-4">
				{[primaryAction, secondaryAction].map((action) => (
					<Button
						key={action.label}
						className="font-medium text-neutral-900! not-disabled:hover:underline disabled:text-neutral-500!"
						disabled={action.disabled}
						leadingIcon={action.icon}
						variant="textlink"
						onClick={action.onClick}
					>
						{action.label}
					</Button>
				))}
			</div>
		</div>
	);
};
