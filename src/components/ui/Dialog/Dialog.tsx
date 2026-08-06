import {
	Dialog as HeadlessDialog,
	DialogPanel,
	DialogTitle,
} from "@headlessui/react";
import type { ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";

type DialogProps = {
	open: boolean;
	title: string;
	description?: string;
	children: ReactNode;
	onClose: () => void;
};

export const Dialog = ({
	open,
	title,
	description,
	children,
	onClose,
}: DialogProps): FunctionComponent => {
	return (
		<HeadlessDialog className="relative z-50" open={open} onClose={onClose}>
			<div aria-hidden="true" className="fixed inset-0 bg-slate-900/40" />
			<div className="fixed inset-0 flex w-screen items-center justify-center p-4">
				<DialogPanel className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
					<DialogTitle className="text-base font-semibold text-slate-900">
						{title}
					</DialogTitle>
					{description === undefined ? null : (
						<p className="mt-1 text-sm text-slate-500">{description}</p>
					)}
					<div className="mt-4">{children}</div>
				</DialogPanel>
			</div>
		</HeadlessDialog>
	);
};
