import { create } from "zustand";

export type ToastTone = "success" | "error";

export type Toast = {
	id: number;
	tone: ToastTone;
	message: string;
};

type ToastStore = {
	toasts: Array<Toast>;
	push: (tone: ToastTone, message: string) => void;
	dismiss: (id: number) => void;
};

let nextId = 0;

export const useToastStore = create<ToastStore>((set) => ({
	toasts: [],
	push: (tone: ToastTone, message: string): void => {
		nextId += 1;

		set((state) => ({
			toasts: [...state.toasts, { id: nextId, tone, message }],
		}));
	},
	dismiss: (id: number): void => {
		set((state) => ({
			toasts: state.toasts.filter((toast) => toast.id !== id),
		}));
	},
}));

/** Reports an outcome to the person who asked for it. */
export function notifySuccess(message: string): void {
	useToastStore.getState().push("success", message);
}

/**
 * Reports a failure. The API's problem detail is written for people, so its
 * message is worth showing verbatim.
 */
export function notifyError(error: unknown): void {
	const message =
		error instanceof Error ? error.message : "Something went wrong.";

	useToastStore.getState().push("error", message);
}
