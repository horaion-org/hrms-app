import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toast } from "@/components/ui/Toast";

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

describe("Toast", () => {
	it("given_aMessage_when_rendered_then_announcesItAsAStatus", () => {
		render(<Toast onDismiss={vi.fn()}>Constraint successfully deleted</Toast>);

		expect(screen.getByRole("status")).toHaveTextContent(
			"Constraint successfully deleted"
		);
	});

	it("given_theDuration_when_itPasses_then_dismissesOnce", () => {
		const onDismiss = vi.fn();
		render(
			<Toast duration={2000} onDismiss={onDismiss}>
				Saved
			</Toast>
		);

		act(() => {
			vi.advanceTimersByTime(1999);
		});
		expect(onDismiss).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(onDismiss).toHaveBeenCalledOnce();
	});

	it("given_aNewHandler_when_reRendered_then_keepsTheOriginalTimer", () => {
		const first = vi.fn();
		const second = vi.fn();
		const { rerender } = render(
			<Toast duration={2000} onDismiss={first}>
				Saved
			</Toast>
		);

		act(() => {
			vi.advanceTimersByTime(1500);
		});
		rerender(
			<Toast duration={2000} onDismiss={second}>
				Saved
			</Toast>
		);
		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledOnce();
	});

	it("given_unmountedEarly_when_theDurationPasses_then_doesNotDismiss", () => {
		const onDismiss = vi.fn();
		const { unmount } = render(<Toast onDismiss={onDismiss}>Saved</Toast>);

		unmount();
		act(() => {
			vi.runAllTimers();
		});

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("given_anAction_when_itsButtonIsPressed_then_runsItBesideTheMessage", () => {
		const onUndo = vi.fn();
		render(
			<Toast action={{ label: "Undo", onClick: onUndo }} onDismiss={vi.fn()}>
				Roster changed.
			</Toast>
		);

		act(() => {
			screen.getByRole("button", { name: "Undo" }).click();
		});

		expect(onUndo).toHaveBeenCalledOnce();
		expect(screen.getByRole("status")).toHaveTextContent("Roster changed.");
	});

	it("given_focusOnTheAction_when_theDurationPasses_then_staysUntilFocusLeaves", () => {
		const onDismiss = vi.fn();
		render(
			<Toast
				action={{ label: "Undo", onClick: vi.fn() }}
				duration={2000}
				onDismiss={onDismiss}
			>
				Roster changed.
			</Toast>
		);

		act(() => {
			screen.getByRole("button", { name: "Undo" }).focus();
		});
		act(() => {
			vi.advanceTimersByTime(5000);
		});
		expect(onDismiss).not.toHaveBeenCalled();

		act(() => {
			screen.getByRole("button", { name: "Undo" }).blur();
		});
		act(() => {
			vi.advanceTimersByTime(2000);
		});
		expect(onDismiss).toHaveBeenCalledOnce();
	});
});
