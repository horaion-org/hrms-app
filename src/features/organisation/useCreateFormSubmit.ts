import { useEffect, useRef, useState, type RefObject } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import type { Refusal } from "@/features/organisation/refusal";

export type CreateFormSubmit<F extends string> = {
	/** The form-level refusal, shown as the Dialog's alert. */
	message: string | undefined;
	/** Receives focus when a refusal has no field to focus. */
	alertRef: RefObject<HTMLParagraphElement | null>;
	/** Discards the form and closes, unless a create is in flight. */
	close: () => void;
	/**
	 * Runs one create. On success the form resets and closes; on refusal the
	 * values stay, field errors are set, and the first refused field (in
	 * `fieldOrder`) or else the alert receives focus.
	 */
	run: (
		create: () => Promise<unknown>,
		refusalOf: (error: unknown) => Refusal<F>
	) => Promise<Refusal<F> | undefined>;
};

/**
 * The submit, refusal and focus handling every Organisation create Dialog
 * shares. It reads only the form's state and resets it, so the form may
 * submit a value of another shape than it holds (a resolver's output).
 */
export const useCreateFormSubmit = <
	V extends FieldValues,
	F extends Path<V> & string,
>(
	form: Pick<UseFormReturn<V>, "reset" | "setError" | "setFocus" | "formState">,
	fieldOrder: ReadonlyArray<F>,
	onClose: () => void
): CreateFormSubmit<F> => {
	const {
		reset,
		setError,
		setFocus,
		formState: { isSubmitting },
	} = form;
	const [message, setMessage] = useState<string>();
	const refusedField = useRef<F | null>(null);
	const alertRef = useRef<HTMLParagraphElement>(null);
	const inFlight = useRef(false);
	useEffect(() => {
		if (isSubmitting) return;
		if (refusedField.current) {
			setFocus(refusedField.current);
			refusedField.current = null;
		} else if (message) alertRef.current?.focus();
	}, [isSubmitting, message, setFocus]);
	const close = (): void => {
		if (inFlight.current) return;
		reset();
		onClose();
	};
	const release = (): void => {
		inFlight.current = false;
	};
	const run: CreateFormSubmit<F>["run"] = async (create, refusalOf) => {
		if (inFlight.current) return undefined;
		inFlight.current = true;
		setMessage(undefined);
		try {
			await create();
			reset();
			onClose();
			return undefined;
		} catch (error) {
			const refusal = refusalOf(error);
			for (const field of fieldOrder) {
				const fieldMessage = refusal.fields[field];
				if (fieldMessage)
					setError(field, { type: "server", message: fieldMessage });
			}
			refusedField.current =
				fieldOrder.find((field) => refusal.fields[field]) ?? null;
			setMessage(refusal.message);
			return refusal;
		} finally {
			release();
		}
	};
	return { message, alertRef, close, run };
};
