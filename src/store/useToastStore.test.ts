import { afterEach, describe, expect, it } from "vitest";
import {
	notifyError,
	notifySuccess,
	useToastStore,
} from "@/store/useToastStore";

afterEach(() => {
	useToastStore.setState({ toasts: [] });
});

describe("useToastStore", () => {
	it("queues toasts in order with distinct ids", () => {
		notifySuccess("Saved");
		notifyError(new Error("Refused"), "Fallback");

		const [first, second] = useToastStore.getState().toasts;
		expect(first).toMatchObject({ tone: "success", message: "Saved" });
		expect(second).toMatchObject({ tone: "error", message: "Refused" });
		expect(first?.id).not.toBe(second?.id);
	});

	it("uses the fallback message for a non-Error failure", () => {
		notifyError("boom", "Something went wrong");

		expect(useToastStore.getState().toasts[0]?.message).toBe(
			"Something went wrong"
		);
	});

	it("dismisses a single toast", () => {
		notifySuccess("One");
		notifySuccess("Two");
		const [first] = useToastStore.getState().toasts;

		useToastStore.getState().dismiss(first?.id ?? -1);

		expect(
			useToastStore.getState().toasts.map((toast) => toast.message)
		).toEqual(["Two"]);
	});
});
