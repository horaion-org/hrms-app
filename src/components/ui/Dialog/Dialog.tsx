import {
	Description,
	Dialog as HeadlessDialog,
	DialogBackdrop,
	DialogPanel,
	DialogTitle,
} from "@headlessui/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/Icon";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type DialogProps = {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	children: ReactNode;
	footer?: ReactNode;
	preventClose?: boolean;
	className?: string;
};

/** A focused task with Headless UI managing dismissal, focus and ARIA wiring. */
export const Dialog = ({
	open,
	onClose,
	title,
	description,
	children,
	footer,
	preventClose = false,
	className,
}: DialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const close = (): void => {
		if (!preventClose) onClose();
	};
	return (
		<HeadlessDialog className="fixed inset-0 z-50" open={open} onClose={close}>
			<DialogBackdrop className="fixed inset-0 bg-black/40" />
			<div className="fixed inset-0 flex items-center justify-center p-4">
				<DialogPanel
					className={joinClassNames(
						"flex max-h-[calc(100dvh-2rem)] w-full max-w-140 flex-col overflow-hidden rounded-2xl bg-white shadow-xl",
						className
					)}
				>
					<header className="shrink-0 border-b border-neutral-200 p-6">
						<div className="flex items-start justify-between gap-4">
							<DialogTitle className="text-xl font-semibold text-neutral-900">
								{title}
							</DialogTitle>
							<Button
								aria-label={t("dialog.close")}
								disabled={preventClose}
								variant="icon"
								onClick={close}
							>
								<CloseIcon />
							</Button>
						</div>
						{description && (
							<Description className="mt-2 text-sm text-neutral-600">
								{description}
							</Description>
						)}
					</header>
					<div className="min-h-0 overflow-y-auto p-6">{children}</div>
					{footer && (
						<footer className="shrink-0 border-t border-neutral-200 p-6">
							{footer}
						</footer>
					)}
				</DialogPanel>
			</div>
		</HeadlessDialog>
	);
};
