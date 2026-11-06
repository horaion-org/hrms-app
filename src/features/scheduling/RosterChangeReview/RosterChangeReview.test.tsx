import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { RosterChangeReview } from "@/features/scheduling/RosterChangeReview";
import type { RosterChangePreview } from "@/features/scheduling/rosterChanges/api";
import {
	rosterChangePreviewFixture,
	rosterCheckFixture,
} from "@/features/scheduling/rosterChanges/fixtures";

const names = {
	member: (): string => "Aisha Rahman",
	shift: (): string => "Front Desk AM",
	day: (): string => "Mon, Oct 12",
};

const show = (preview: RosterChangePreview | undefined): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<RosterChangeReview
				names={names}
				preview={preview}
				remark=""
				ticked={false}
				onRemarkChange={vi.fn()}
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
				"Scheduling rules aren’t checked again for changes made by hand."
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
});
