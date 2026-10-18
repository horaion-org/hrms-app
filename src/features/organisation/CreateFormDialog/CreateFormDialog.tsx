import type { FormEvent, ReactNode, RefObject } from "react";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export type CreateFormDialogProps = {
	title: string;
	description: string;
	/** Ties the footer's submit button to the form. */
	formId: string;
	submitLabel: string;
	cancelLabel: string;
	submitting: boolean;
	/** Disables submit, e.g. while every field is still empty. */
	submitDisabled?: boolean;
	/** A form-level refusal, announced and focusable. */
	message?: string;
	alertRef?: RefObject<HTMLParagraphElement | null>;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onClose: () => void;
	className?: string;
	children: ReactNode;
};

/**
 * An Organisation create Dialog: the form, its form-level alert, and the
 * Cancel and submit footer. Closing is blocked while submitting.
 */
export const CreateFormDialog = ({
	title,
	description,
	formId,
	submitLabel,
	cancelLabel,
	submitting,
	submitDisabled = false,
	message,
	alertRef,
	onSubmit,
	onClose,
	className,
	children,
}: CreateFormDialogProps): FunctionComponent => (
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
					disabled={submitDisabled}
					form={formId}
					loading={submitting}
					type="submit"
				>
					{submitLabel}
				</Button>
			</div>
		}
		onClose={onClose}
	>
		<form
			noValidate
			aria-busy={submitting}
			className="space-y-6"
			id={formId}
			onSubmit={onSubmit}
		>
			{message && (
				<p
					ref={alertRef}
					className="text-sm text-error-700"
					role="alert"
					tabIndex={-1}
				>
					{message}
				</p>
			)}
			{children}
		</form>
	</Dialog>
);
