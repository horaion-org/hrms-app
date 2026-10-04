import {
	Dialog,
	DialogBackdrop,
	DialogPanel,
	DialogTitle,
} from "@headlessui/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/Icon";

export type ModalProps = {
	open: boolean;
	title: string;
	children: ReactNode;
	footer?: ReactNode;
	onClose: () => void;
};

export const Modal = ({
	open,
	title,
	children,
	footer,
	onClose,
}: ModalProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Dialog className="relative z-50" open={open} onClose={onClose}>
			<DialogBackdrop className="fixed inset-0 bg-black/80" />
			<div className="fixed inset-0 overflow-y-auto">
				<div className="flex min-h-full items-center justify-center p-4 sm:p-8">
					<DialogPanel className="w-full max-w-150 overflow-hidden rounded-lg border border-neutral-400 bg-white text-neutral-900 shadow-xl">
						<header className="flex min-h-20 items-center justify-between gap-4 border-b border-neutral-400 px-6 py-4">
							<DialogTitle className="text-xl font-semibold">
								{title}
							</DialogTitle>
							<Button
								aria-label={t("leaveUi.close")}
								variant="icon"
								onClick={onClose}
							>
								<CloseIcon />
							</Button>
						</header>
						{children}
						{footer && (
							<footer className="flex gap-4 border-t border-neutral-400 p-6 [&>button]:min-w-0 [&>button]:flex-1 [&>button]:px-3 [&>button]:text-sm [&>button]:whitespace-normal sm:[&>button]:text-base">
								{footer}
							</footer>
						)}
					</DialogPanel>
				</div>
			</div>
		</Dialog>
	);
};
