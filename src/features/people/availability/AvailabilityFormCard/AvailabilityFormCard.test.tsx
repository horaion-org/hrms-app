import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { WEEKDAYS } from "@/common/weekdays";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { MemberProfileDetail } from "@/features/people/api";
import {
	AvailabilityFormCard,
	type AvailabilityFormCardProps,
} from "@/features/people/availability/AvailabilityFormCard";
import { storyCompany } from "@/features/people/storyCompany";

const PATH = "/api/v1/companies/c-1/member-profiles/m-1/availability";

const kent = {
	membershipId: "m-1",
	displayName: "Kent Chua",
	branchId: "b-1",
	departmentId: "d-1",
	employmentType: "FULL_TIME",
} as MemberProfileDetail;

const noWindows = envelope({
	membershipId: "m-1",
	days: WEEKDAYS.map((day) => ({
		day,
		windows: [],
	})),
});

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

const show = (
	props: Partial<AvailabilityFormCardProps>
): ReturnType<typeof vi.fn> => {
	const onDraftChange = vi.fn();
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const Card = (): ReactElement => (
		<>
			<AvailabilityFormCard
				companyId="c-1"
				draft={undefined}
				employmentType="PART_TIME"
				profile={kent}
				onDraftChange={onDraftChange}
				{...props}
			/>
			<p>Rendered</p>
		</>
	);
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				{storyCompany(client, "c-1")(Card, {
					parameters: {
						permissions: ["work_availability:read", "member_profile:update"],
					},
				} as never)}
			</QueryClientProvider>
		</I18nextProvider>
	);
	return onDraftChange;
};

describe("AvailabilityFormCard", () => {
	it("given_partTimeChosenForSomeoneWithoutWindows_when_shown_then_asksForTheirHours", async () => {
		stubApi({ [`GET ${PATH}`]: { status: 200, body: noWindows } });
		show({ employmentType: "PART_TIME" });

		expect(
			await screen.findByText(
				"Add the hours this person can work. Without them they can’t be rostered."
			)
		).toBeVisible();
	});

	it("given_anotherTypeChosen_when_shown_then_rendersNothingAndAsksForNothing", async () => {
		const calls = stubApi({});
		show({ employmentType: "CONTRACT" });

		expect(await screen.findByText("Rendered")).toBeVisible();
		expect(
			screen.queryByRole("heading", { name: "Availability" })
		).not.toBeInTheDocument();
		expect(calls).toHaveLength(0);
	});

	it("given_aDraft_when_shown_then_showsItInsteadOfWhatIsSaved", async () => {
		stubApi({ [`GET ${PATH}`]: { status: 200, body: noWindows } });
		show({ draft: [{ day: "SAT", startTime: "08:00", endTime: "12:00" }] });

		expect(await screen.findByText("08:00–12:00")).toBeVisible();
	});

	it("given_windowsAddedInTheDialog_when_saved_then_holdsThemInTheDraftWithoutSaving", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			[`GET ${PATH}`]: { status: 200, body: noWindows },
		});
		const onDraftChange = show({});

		await user.click(
			await screen.findByRole("button", { name: "Edit availability" })
		);
		const dialog = await screen.findByRole("dialog");
		await user.click(
			within(dialog).getByRole("button", { name: "Add window" })
		);
		await user.click(within(dialog).getByRole("button", { name: "Days" }));
		await user.click(await screen.findByRole("option", { name: "Monday" }));
		await user.keyboard("{Escape}");
		await user.click(
			within(dialog).getByRole("button", { name: "Start time" })
		);
		await user.click(await screen.findByRole("option", { name: "09:00" }));
		await user.click(within(dialog).getByRole("button", { name: "End time" }));
		await user.click(await screen.findByRole("option", { name: "13:00" }));
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		expect(onDraftChange).toHaveBeenCalledWith([
			{ day: "MON", startTime: "09:00", endTime: "13:00" },
		]);
		expect(calls.some((call) => call.method === "PUT")).toBe(false);
	});
});
