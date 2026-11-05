import { composeStories } from "@storybook/react-vite";
import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LeaveDecisionStep } from "./LeaveDecisionStep";
import * as stories from "./LeaveDecisionStep.stories";

const { RejectMissingReason } = composeStories(stories);

it("given_aMissingReason_when_shown_then_marksTheReasonRequiredAndDescribesItsError", () => {
	render(<RejectMissingReason />);

	const reason = screen.getByRole("textbox", { name: /Reason for rejection/ });
	expect(reason).toBeRequired();
	expect(reason).toHaveAccessibleDescription("Enter a reason");
});

it("given_anApproval_when_typedAndSubmitted_then_handsBackTheNoteAndTheSubmit", () => {
	const onNoteChange = vi.fn();
	const onSubmit = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveDecisionStep
				decision="approve"
				id="decision"
				note=""
				onNoteChange={onNoteChange}
				onSubmit={onSubmit}
			/>
		</I18nextProvider>
	);

	const comment = screen.getByRole("textbox");
	expect(comment).not.toBeRequired();
	fireEvent.change(comment, { target: { value: "Enjoy" } });
	fireEvent.submit(comment.closest("form")!);

	expect(onNoteChange).toHaveBeenCalledWith("Enjoy");
	expect(onSubmit).toHaveBeenCalledOnce();
});
