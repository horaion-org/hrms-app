import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { CoverOfferSent } from "@/features/scheduling/coverOffers/CoverOfferActions/CoverOfferSent";
import {
	BEFORE_DEADLINE,
	coverOfferFixture,
} from "@/features/scheduling/coverOffers/fixtures";

describe("CoverOfferSent", () => {
	it("given_aSentOffer_when_shown_then_saysWhoAndByWhenAndWithdraws", async () => {
		const onWithdraw = vi.fn();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<CoverOfferSent
					name="Aisha Rahman"
					now={() => BEFORE_DEADLINE}
					offer={coverOfferFixture()}
					timeZone="Asia/Singapore"
					onWithdraw={onWithdraw}
				/>
			</I18nextProvider>
		);

		expect(
			screen.getByText("Offer sent to Aisha Rahman · answer by 03:30 PM")
		).toBeVisible();
		expect(screen.getByText("Ana is off sick, can you help?")).toBeVisible();
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Withdraw offer" }));
		expect(onWithdraw).toHaveBeenCalledWith("o-1");
	});
});
