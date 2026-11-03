import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { WEEKDAYS } from "@/common/weekdays";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { MemberProfileDetail } from "@/features/people/api";
import { MemberAvailabilityCard } from "@/features/people/availability/MemberAvailabilityCard";
import { storyCompany } from "@/features/people/storyCompany";

const PATH = "/api/v1/companies/c-1/member-profiles/m-1/availability";

const kent = (
	employmentType: MemberProfileDetail["employmentType"]
): MemberProfileDetail =>
	({
		membershipId: "m-1",
		displayName: "Kent Chua",
		branchId: "b-1",
		departmentId: "d-1",
		employmentType,
	}) as MemberProfileDetail;

const pattern = (
	windows: Array<{ startTime: string; endTime: string }>
): unknown =>
	envelope({
		membershipId: "m-1",
		days: WEEKDAYS.map((day) => ({
			day,
			windows: day === "MON" ? windows : [],
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
	card: () => ReactElement,
	permissions: Array<string> = ["work_availability:read"]
): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				{storyCompany(client, "c-1")(card, {
					parameters: { permissions },
				} as never)}
			</QueryClientProvider>
		</I18nextProvider>
	);
};

describe("MemberAvailabilityCard", () => {
	it("given_aPartTimer_when_shown_then_listsTheirWeek", async () => {
		stubApi({
			[`GET ${PATH}`]: {
				status: 200,
				body: pattern([{ startTime: "09:00", endTime: "17:00" }]),
			},
		});
		show(() => (
			<MemberAvailabilityCard
				changeable={false}
				companyId="c-1"
				profile={kent("PART_TIME")}
			/>
		));

		expect(await screen.findByText("09:00–17:00")).toBeVisible();
		expect(screen.getByRole("heading", { name: "Availability" })).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Edit availability" })
		).not.toBeInTheDocument();
	});

	it("given_aFullTimer_when_shown_then_rendersNothingAndAsksForNothing", async () => {
		const calls = stubApi({});
		show(() => (
			<>
				<MemberAvailabilityCard
					changeable
					companyId="c-1"
					profile={kent("FULL_TIME")}
				/>
				<p>Rendered</p>
			</>
		));

		expect(await screen.findByText("Rendered")).toBeVisible();
		expect(
			screen.queryByRole("heading", { name: "Availability" })
		).not.toBeInTheDocument();
		expect(calls).toHaveLength(0);
	});

	it("given_noWorkAvailabilityRead_when_shown_then_rendersNothing", async () => {
		stubApi({});
		show(
			() => (
				<>
					<MemberAvailabilityCard
						changeable
						companyId="c-1"
						profile={kent("PART_TIME")}
					/>
					<p>Rendered</p>
				</>
			),
			["member_profile:read"]
		);

		expect(await screen.findByText("Rendered")).toBeVisible();
		expect(
			screen.queryByRole("heading", { name: "Availability" })
		).not.toBeInTheDocument();
	});

	it("given_someoneWhoMayChangeIt_when_edited_then_replacesTheSetAtOnce", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			[`GET ${PATH}`]: {
				status: 200,
				body: pattern([{ startTime: "09:00", endTime: "17:00" }]),
			},
			[`PUT ${PATH}`]: {
				status: 200,
				body: pattern([{ startTime: "10:00", endTime: "17:00" }]),
			},
		});
		show(() => (
			<MemberAvailabilityCard
				changeable
				companyId="c-1"
				profile={kent("PART_TIME")}
			/>
		));

		await user.click(
			await screen.findByRole("button", { name: "Edit availability" })
		);
		const dialog = await screen.findByRole("dialog");
		await user.click(
			within(dialog).getByRole("button", { name: "Start time" })
		);
		await user.click(await screen.findByRole("option", { name: "10:00" }));
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		expect(await screen.findByText("10:00–17:00")).toBeVisible();
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		const put = calls.find((call) => call.method === "PUT");
		expect(put?.body).toEqual({
			windows: [{ day: "MON", startTime: "10:00", endTime: "17:00" }],
		});
	});
});
