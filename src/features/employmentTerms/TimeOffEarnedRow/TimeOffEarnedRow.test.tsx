import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { timeOffBalanceFixture } from "@/features/employmentTerms/fixtures";
import type { TimeOffBalance } from "@/features/employmentTerms/timeOffBalance";
import { TimeOffEarnedRow } from "@/features/employmentTerms/TimeOffEarnedRow";

const show = (balance: TimeOffBalance): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<TimeOffEarnedRow balance={balance} displayName="Mei Tan" />
		</I18nextProvider>
	);
};

describe("TimeOffEarnedRow", () => {
	it("given_aBalance_when_shown_then_itsHoursAndHistoryListsEachLineOldestFirst", async () => {
		const user = userEvent.setup();
		show(timeOffBalanceFixture());

		expect(screen.getByText("4 h")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "History" }));

		const dialog = screen.getByRole("dialog", { name: "Time off earned" });
		expect(dialog).toHaveTextContent(
			"Every week that earned Mei Tan time off, and every Off in lieu taken from it, oldest first."
		);
		const rows = within(dialog).getAllByRole("row").slice(1);
		expect(rows.map((row) => row.textContent)).toEqual([
			"Week of 16 Nov 2026Earned by extra hours+8 h",
			"27 Nov 2026Taken as Off in lieu−4 h",
		]);
	});

	it("given_noLines_when_shown_then_noHistory", () => {
		show(timeOffBalanceFixture({ balanceMinutes: 0, entries: [] }));

		expect(screen.getByText("0 min")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "History" })).toBeNull();
	});
});
