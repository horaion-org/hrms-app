import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { RosterChangeChecks } from "@/features/scheduling/RosterChangeChecks";
import { rosterCheckFixture } from "@/features/scheduling/rosterChanges/fixtures";

const names = {
	member: (): string => "Aisha Rahman",
	shift: (): string => "Front Desk AM",
	day: (): string => "Mon, Oct 12",
	dayType: (): string => "rest day",
};

describe("RosterChangeChecks", () => {
	it("given_checksOfEachLevel_when_rendered_then_eachSaysWhatItAsksBesideItsSentence", () => {
		render(
			<I18nextProvider i18n={authTestI18n}>
				<RosterChangeChecks
					names={names}
					checks={[
						rosterCheckFixture({
							code: "SHIFT_NOT_ON_DAY",
							severity: "REFUSED",
						}),
						rosterCheckFixture({
							code: "OUTSIDE_AVAILABILITY",
							severity: "NEEDS_REMARK",
						}),
						rosterCheckFixture({
							code: "ROSTERED_ELSEWHERE",
							severity: "NEEDS_ACKNOWLEDGEMENT",
						}),
						rosterCheckFixture(),
					]}
				/>
			</I18nextProvider>
		);

		expect(
			screen.getAllByRole("listitem").map((item) => item.textContent)
		).toEqual([
			"Can’tFront Desk AM doesn’t run on Mon, Oct 12.",
			"Needs a remarkFront Desk AM is outside Aisha Rahman’s availability on Mon, Oct 12.",
			"CheckAisha Rahman also works on Mon, Oct 12 in another roster.",
			"NoteFront Desk AM, Mon, Oct 12: 2 → 1 people.",
		]);
	});

	it("given_noChecks_when_rendered_then_saysNothingWasFound", () => {
		render(
			<I18nextProvider i18n={authTestI18n}>
				<RosterChangeChecks checks={[]} names={names} />
			</I18nextProvider>
		);

		expect(screen.getByText("No problems found.")).toBeVisible();
	});
});
