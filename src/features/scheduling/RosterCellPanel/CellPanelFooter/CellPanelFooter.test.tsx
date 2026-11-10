import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { BEFORE_DEADLINE } from "@/features/scheduling/coverOffers/fixtures";
import { CellPanelFooter, type CellPanelFooterProps } from "./CellPanelFooter";

const show = (props: Partial<CellPanelFooterProps> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<CellPanelFooter
				applyDisabled={false}
				applyLabel="Apply change"
				busy={false}
				onApply={vi.fn()}
				onCancel={vi.fn()}
				{...props}
			/>
		</I18nextProvider>
	);
};

describe("CellPanelFooter", () => {
	it("given_aReadyReview_when_applyOrCancelIsPressed_then_reportsEach", async () => {
		const onApply = vi.fn();
		const onCancel = vi.fn();
		show({ onApply, onCancel });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Apply change" }));
		await user.click(screen.getByRole("button", { name: "Cancel" }));

		expect(onApply).toHaveBeenCalledOnce();
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it("given_aReviewStillAskingForSomething_when_rendered_then_holdsApply", () => {
		show({ applyDisabled: true });

		expect(screen.getByRole("button", { name: "Apply change" })).toBeDisabled();
	});

	it("given_aChangeThatNeedsTheMembersYes_when_rendered_then_offersItInPlaceOfApply", async () => {
		const onSend = vi.fn();
		show({
			offerActions: {
				name: "Ben Ong",
				timeZone: "Asia/Singapore",
				ready: true,
				onSend,
				onRecord: vi.fn(),
				now: (): Date => BEFORE_DEADLINE,
			},
		});

		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Send offer" }));

		expect(onSend).toHaveBeenCalledOnce();
		expect(screen.queryByRole("button", { name: "Apply change" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
	});
});
