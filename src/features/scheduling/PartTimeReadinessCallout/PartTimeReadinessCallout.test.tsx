import { render, screen, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { MemberWithoutAvailability } from "@/features/availability/api";
import { PartTimeReadinessCallout } from "@/features/scheduling/PartTimeReadinessCallout";

/** The Department's team availability for the schedule's week: the period starts on Wednesday 11 Nov. */
const TEAM_WEEK =
	"/availability?view=team&branch=b-1&department=d-2&week=2026-11-09";

const show = (members: Array<MemberWithoutAvailability>): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<MemoryRouterHarness>
				<PartTimeReadinessCallout
					members={members}
					periodStart="2026-11-11"
					unit={{ branchId: "b-1", departmentId: "d-2" }}
				/>
				<p>Rendered</p>
			</MemoryRouterHarness>
		</I18nextProvider>
	);
};

describe("PartTimeReadinessCallout", () => {
	it("given_partTimersWithoutAvailability_when_shown_then_warnsAndLinksTheTeamsWeek", async () => {
		show([
			{ membershipId: "m-1", memberProfileId: "p-1", displayName: "Kent Chua" },
			{
				membershipId: "m-2",
				memberProfileId: "p-2",
				displayName: "Priya Nair",
			},
		]);

		const note = await screen.findByRole("note");
		expect(note).toHaveTextContent(
			"2 part-time members have no availability and will be left off the roster:"
		);
		expect(note).toHaveClass("bg-warning-50");
		expect(
			within(note).getByRole("link", { name: "Kent Chua" })
		).toHaveAttribute("href", TEAM_WEEK);
		expect(
			within(note).getByRole("link", { name: "Priya Nair" })
		).toHaveAttribute("href", TEAM_WEEK);
	});

	it("given_onePartTimer_when_shown_then_speaksOfOneMember", async () => {
		show([
			{ membershipId: "m-1", memberProfileId: "p-1", displayName: "Kent Chua" },
		]);

		expect(await screen.findByRole("note")).toHaveTextContent(
			"1 part-time member has no availability and will be left off the roster:"
		);
	});

	it("given_noneWithoutAvailability_when_shown_then_rendersNothing", async () => {
		show([]);

		expect(await screen.findByText("Rendered")).toBeVisible();
		expect(screen.queryByRole("note")).not.toBeInTheDocument();
	});
});
