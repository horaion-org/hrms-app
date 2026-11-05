import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	rosterChangePreviewFixture,
	rosterCheckFixture,
} from "@/features/scheduling/rosterChanges/fixtures";
import { UndoRosterChangeDialog } from "@/features/scheduling/UndoRosterChangeDialog";

describe("UndoRosterChangeDialog", () => {
	it("given_anUndoThatNeedsATick_when_ticked_then_confirmsWithTheFingerprint", async () => {
		const onConfirm = vi.fn();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<UndoRosterChangeDialog
					submitting={false}
					preview={rosterChangePreviewFixture({
						expectedRevision: 2,
						checks: [
							rosterCheckFixture({
								code: "ROSTERED_ELSEWHERE",
								severity: "NEEDS_ACKNOWLEDGEMENT",
								membershipId: "m-1",
							}),
						],
						needsAcknowledgement: true,
						checksFingerprint: "a".repeat(64),
					})}
					onClose={vi.fn()}
					onConfirm={onConfirm}
				/>
			</I18nextProvider>
		);
		const user = userEvent.setup();
		const confirm = screen.getByRole("button", { name: "Undo change" });
		expect(confirm).toBeDisabled();

		await user.click(
			screen.getByRole("checkbox", { name: "I’ve read these checks" })
		);
		await user.click(confirm);

		expect(onConfirm).toHaveBeenCalledWith({
			expectedRevision: 2,
			remark: undefined,
			checksFingerprint: "a".repeat(64),
		});
	});

	it("given_anUndoARefusalBlocks_when_shown_then_itCannotBeConfirmed", () => {
		render(
			<I18nextProvider i18n={authTestI18n}>
				<UndoRosterChangeDialog
					submitting={false}
					preview={rosterChangePreviewFixture({
						refused: true,
						checks: [
							rosterCheckFixture({ code: "MEMBER_GONE", severity: "REFUSED" }),
						],
					})}
					onClose={vi.fn()}
					onConfirm={vi.fn()}
				/>
			</I18nextProvider>
		);

		expect(screen.getByRole("button", { name: "Undo change" })).toBeDisabled();
	});
});
