import type { ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export type ConfirmDialogProps = {
	title: string;
	/** What will happen, in a sentence. */
	description?: string;
	/** Says what confirming does, e.g. "Deactivate branch"; never just "OK". */
	confirmLabel: string;
	cancelLabel: string;
	/** Holds confirming back, e.g. until what is affected has loaded. */
	confirmDisabled?: boolean;
	/** True while the action is being carried out; blocks closing and confirming twice. */
	submitting?: boolean;
	/** Why the last attempt failed. */
	error?: string;
	onConfirm: () => void;
	onClose: () => void;
	/** Anything the person should see before deciding, such as who is affected. */
	children?: ReactNode;
	className?: string;
};

/**
 * A Dialog that asks before an action takes effect. It is mounted only
 * while the question is open, so it carries no `open` prop.
 */
export const ConfirmDialog = ({
	title,
	description,
	confirmLabel,
	cancelLabel,
	confirmDisabled = false,
	submitting = false,
	error,
	onConfirm,
	onClose,
	children,
	className,
}: ConfirmDialogProps): FunctionComponent => (
	<Dialog
		open
		className={className}
		description={description}
		preventClose={submitting}
		title={title}
		footer={
			<div className="flex justify-end gap-3">
				<Button disabled={submitting} variant="cancel" onClick={onClose}>
					{cancelLabel}
				</Button>
				<Button
					disabled={confirmDisabled}
					loading={submitting}
					onClick={onConfirm}
				>
					{confirmLabel}
				</Button>
			</div>
		}
		onClose={onClose}
	>
		{error && (
			<p className="mb-6 text-sm text-error-700" role="alert">
				{error}
			</p>
		)}
		{children}
	</Dialog>
);
