import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	RosterChangeReview,
	type RosterChangeReviewProps,
} from "@/features/scheduling/rosterChanges/RosterChangeReview";
import type { RosterChangePreview } from "@/features/scheduling/rosterChanges/api";
import {
	rosterChangePreviewFixture,
	rosterCheckFixture,
} from "@/features/scheduling/rosterChanges/fixtures";

const names = {
	member: (): string => "Aisha Rahman",
	shift: (): string => "Front Desk AM",
	day: (): string => "Mon, Oct 12",
	dayType: (): string => "rest day",
};

const show = (
	preview: RosterChangePreview | undefined,
	showsRulesNote?: boolean,
	refused: Pick<
		RosterChangeReviewProps,
		"previewRefusal" | "onRetryPreview"
	> = {}
): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<RosterChangeReview
				names={names}
				preview={preview}
				previewRefusal={refused.previewRefusal}
				remark=""
				showsRulesNote={showsRulesNote}
				ticked={false}
				onRemarkChange={vi.fn()}
				onRetryPreview={refused.onRetryPreview}
				onTickedChange={vi.fn()}
			/>
		</I18nextProvider>
	);
};

describe("RosterChangeReview", () => {
	it("given_aCheckThatNeedsARemark_when_shown_then_beforeAfterTheChecksARequiredRemarkAndTheTick", () => {
		show(
			rosterChangePreviewFixture({
				checks: [
					rosterCheckFixture({
						code: "LEAVE_APPROVED",
						severity: "NEEDS_REMARK",
					}),
				],
			})
		);

		expect(
			screen.getByText(/Front Desk AM · 09:00 – 15:00 → Day off/)
		).toBeVisible();
		expect(
			screen.getByText(
				"Working-time rules aren’t checked for changes made by hand. After you apply this, press Validate schedule."
			)
		).toBeVisible();
		expect(
			screen.getByRole("textbox", { name: /Remark \(required\)/ })
		).toBeVisible();
		expect(
			screen.getByRole("checkbox", { name: "I’ve read these checks" })
		).toBeVisible();
	});

	it("given_aRefusal_when_shown_then_noRemarkAndNoTick", () => {
		show(
			rosterChangePreviewFixture({
				checks: [
					rosterCheckFixture({ code: "SHIFT_NOT_ON_DAY", severity: "REFUSED" }),
				],
			})
		);

		expect(screen.queryByRole("textbox")).toBeNull();
		expect(screen.queryByRole("checkbox")).toBeNull();
	});

	it("given_noPreviewYet_when_shown_then_saysItIsChecking", () => {
		show(undefined);

		expect(screen.getByRole("status")).toHaveTextContent("Checking…");
	});

	it("given_aPanelThatSaysItItself_when_shown_then_noRulesNote", () => {
		show(rosterChangePreviewFixture(), false);

		expect(screen.queryByRole("note")).toBeNull();
		expect(screen.getByText("Checks")).toBeVisible();
	});

	it.each([
		["failed", "Try again"],
		["revision", "Reload roster"],
	] as const)(
		"given_aPreviewRefusedAs_%s_when_shown_then_saysWhyWithItsRetry",
		async (previewRefusal, action) => {
			const onRetryPreview = vi.fn();
			show(undefined, true, { previewRefusal, onRetryPreview });

			const alert = screen.getByRole("alert");
			await userEvent.click(
				within(alert).getByRole("button", { name: action })
			);

			expect(onRetryPreview).toHaveBeenCalledOnce();
		}
	);

	it.each([
		[
			"invalid",
			"This change can’t be made: it changes nothing, or names a day or shift that isn’t on this roster. Choose a different change.",
		],
		[
			"notEditable",
			"This roster can’t be changed now: only a generated or published roster can be. Reload the page to see where it stands.",
		],
	] as const)(
		"given_aPreviewRefusedAs_%s_when_shown_then_itsOwnMessageAndNoRetryThatCannotWork",
		(previewRefusal, message) => {
			show(undefined, true, { previewRefusal, onRetryPreview: vi.fn() });

			const alert = screen.getByRole("alert");
			expect(alert).toHaveTextContent(message);
			expect(within(alert).queryByRole("button")).toBeNull();
		}
	);

	describe("as the Issues panel keeps it", () => {
		/** The review with no empty checks and the remark folded, `remark` and `remarkRequired` as given. */
		const showQuiet = (
			preview: RosterChangePreview,
			{ remark = "", remarkRequired = false } = {}
		): void => {
			render(
				<I18nextProvider i18n={authTestI18n}>
					<RosterChangeReview
						remarkFolded
						names={names}
						preview={preview}
						remark={remark}
						remarkRequired={remarkRequired}
						showsEmptyChecks={false}
						showsRulesNote={false}
						ticked={false}
						onRemarkChange={vi.fn()}
						onTickedChange={vi.fn()}
					/>
				</I18nextProvider>
			);
		};

		it("given_noChecks_when_shown_then_noChecksHeadingAndTheRemarkBehindAddARemark", async () => {
			showQuiet(rosterChangePreviewFixture({ checks: [] }));

			expect(screen.queryByRole("heading", { name: "Checks" })).toBeNull();
			expect(screen.queryByRole("textbox")).toBeNull();
			await userEvent.click(
				screen.getByRole("button", { name: "Add a remark" })
			);

			expect(screen.getByRole("textbox")).toHaveFocus();
		});

		it("given_checks_when_shown_then_theyAreListed", () => {
			showQuiet(rosterChangePreviewFixture());

			expect(screen.getByRole("heading", { name: "Checks" })).toBeVisible();
		});

		it("given_aRemarkRequiredOrAlreadyWritten_when_shown_then_theBoxIsOpen", () => {
			showQuiet(rosterChangePreviewFixture({ checks: [] }), {
				remarkRequired: true,
			});
			expect(screen.getByRole("textbox")).toBeVisible();
		});

		it("given_aRemarkAlreadyWritten_when_shown_then_theBoxIsOpenSoNothingIsSentUnseen", () => {
			showQuiet(rosterChangePreviewFixture({ checks: [] }), {
				remark: "Covers Ben Ong",
			});
			expect(screen.getByRole("textbox")).toHaveValue("Covers Ben Ong");
		});
	});
});
