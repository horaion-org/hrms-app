import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	memberAvailabilityQuery,
	type MemberWeek,
} from "@/features/availability/api";
import type { AvailabilityScope } from "@/features/availability/availabilityModel";
import {
	FIXTURE_WEEK,
	MEMBER_WEEK_FIXTURES,
	WEEKDAY_MORNINGS,
	weeklyAvailabilityFixture,
} from "@/features/availability/fixtures";
import { MemberAvailabilityDialog } from "@/features/availability/MemberAvailabilityDialog";

const AISHA = "/api/v1/companies/c-1/member-profiles/m-aisha/availability";
const CHERYL_WEEK = `/api/v1/companies/c-1/member-profiles/m-cheryl/availability/weeks/${FIXTURE_WEEK}`;
const THIS_WEEK: AvailabilityScope = {
	kind: "week",
	weekStartMonday: FIXTURE_WEEK,
};
const [aisha, cheryl] = MEMBER_WEEK_FIXTURES as [MemberWeek, MemberWeek];

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

const show = (member: MemberWeek, scope: AvailabilityScope): QueryClient => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	client.setQueryData(
		memberAvailabilityQuery("c-1", "m-aisha").queryKey,
		weeklyAvailabilityFixture(WEEKDAY_MORNINGS, { membershipId: "m-aisha" })
	);
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<MemberAvailabilityDialog
					companyId="c-1"
					member={member}
					scope={scope}
					onClose={vi.fn()}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
	return client;
};

describe("MemberAvailabilityDialog", () => {
	it("given_aWeekOnThePattern_when_opened_then_startsFromTheRowAndOffersNoReset", () => {
		stubApi({});
		show(aisha, THIS_WEEK);

		const dialog = screen.getByRole("dialog");
		expect(within(dialog).getAllByRole("group")).toHaveLength(2);
		expect(
			within(dialog).queryByRole("button", { name: "Reset to default" })
		).not.toBeInTheDocument();
	});

	it("given_aCustomWeek_when_reset_then_deletesThatWeekOfTheMember", async () => {
		const user = userEvent.setup();
		const calls = stubApi({ [`DELETE ${CHERYL_WEEK}`]: { status: 204 } });
		show(cheryl, THIS_WEEK);

		await user.click(screen.getByRole("button", { name: "Reset to default" }));
		await user.click(
			within(
				await screen.findByRole("dialog", {
					name: "Reset this week to the default pattern?",
				})
			).getByRole("button", { name: "Reset to default" })
		);

		await waitFor(() => {
			expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
				`DELETE ${CHERYL_WEEK}`,
			]);
		});
	});

	it("given_thePattern_when_saved_then_putsTheWholeSetToTheMembersRoute", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			[`PUT ${AISHA}`]: {
				status: 200,
				body: envelope(
					weeklyAvailabilityFixture(WEEKDAY_MORNINGS, {
						membershipId: "m-aisha",
					})
				),
			},
		});
		show(aisha, { kind: "pattern" });

		expect(
			screen.getByRole("heading", { name: "Edit availability" })
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(calls.filter((call) => call.method === "PUT")).toHaveLength(1);
		});
		expect(calls[0]?.path).toBe(AISHA);
		expect(calls[0]?.body).toEqual({ windows: WEEKDAY_MORNINGS });
	});
});
