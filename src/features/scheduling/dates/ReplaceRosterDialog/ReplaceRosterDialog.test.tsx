import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { ReplacedDays } from "@/features/scheduling/dates/replacedDays";
import { ReplaceRosterDialog } from "@/features/scheduling/dates/ReplaceRosterDialog";

const THURSDAY_TO_SUNDAY = { from: "2026-11-19", to: "2026-11-22" };

/** Shows the dialog for a run replacing `replaces`, and answers its two callbacks. */
const show = (
	replaces: ReplacedDays
): {
	onConfirm: ReturnType<typeof vi.fn>;
	onClose: ReturnType<typeof vi.fn>;
} => {
	const onConfirm = vi.fn();
	const onClose = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<ReplaceRosterDialog
				replaces={replaces}
				onClose={onClose}
				onConfirm={onConfirm}
			/>
		</I18nextProvider>
	);
	return { onConfirm, onClose };
};

/** The dialog's bullet lines, in order. */
const bullets = (): Array<string | null> =>
	within(screen.getByRole("dialog"))
		.getAllByRole("listitem")
		.map((item) => item.textContent);

describe("ReplaceRosterDialog", () => {
	it("given_aRosterToReviewNeverPublished_when_shown_then_namesItsDaysAndSaysPublishedDaysStay", () => {
		show({ days: [THURSDAY_TO_SUNDAY], seenByStaff: [], handChanges: 0 });

		const dialog = screen.getByRole("dialog", {
			name: "Replace the roster to review?",
		});
		expect(dialog).toHaveTextContent(
			/There is a roster to review on Nov 19\s?–\s?22, 2026\. Generating works these days out again and replaces it\./
		);
		expect(bullets()).toEqual(["Published days stay as they are."]);
	});

	it("given_aWithdrawnRosterChangedByHand_when_shown_then_saysStaffSawItAndCountsTheHandChanges", () => {
		show({
			days: [THURSDAY_TO_SUNDAY],
			seenByStaff: [THURSDAY_TO_SUNDAY],
			handChanges: 2,
		});

		expect(bullets()).toEqual([
			expect.stringMatching(
				/^Staff saw the roster for Nov 19\s?–\s?22, 2026 while it was published\.$/
			),
			"Publish the new roster for staff to see it.",
			"2 changes made by hand will be replaced.",
			"Published days stay as they are.",
		]);
	});

	it.each([
		[
			"one day",
			[{ from: "2026-11-19", to: "2026-11-19" }],
			/on Nov 19, 2026\. Generating works this day out again and replaces it\./,
		],
		[
			"two runs of days",
			[
				{ from: "2026-11-16", to: "2026-11-17" },
				{ from: "2026-11-20", to: "2026-11-22" },
			],
			/on Nov 16\s?–\s?17, 2026 and Nov 20\s?–\s?22, 2026\. Generating works these days out again/,
		],
	])("given_%s_when_shown_then_theBodyNamesThem", (_, days, body) => {
		show({ days, seenByStaff: [], handChanges: 0 });

		expect(screen.getByRole("dialog")).toHaveTextContent(body);
	});

	it("given_theDialog_when_answered_then_confirmAndCancelEachCallTheirOwn", async () => {
		const user = userEvent.setup();
		const { onConfirm, onClose } = show({
			days: [THURSDAY_TO_SUNDAY],
			seenByStaff: [],
			handChanges: 1,
		});

		expect(bullets()[0]).toBe("1 change made by hand will be replaced.");
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();

		await user.click(
			screen.getByRole("button", { name: "Generate and replace" })
		);
		expect(onConfirm).toHaveBeenCalledTimes(1);
	});
});
