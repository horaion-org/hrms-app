import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { WEEKDAYS } from "@/common/weekdays";
import { authTestI18n } from "@/features/auth/testingI18n";
import { MyAvailabilityCard } from "@/features/people/availability/MyAvailabilityCard";

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

const show = (employmentType: "PART_TIME" | "FULL_TIME"): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<MyAvailabilityCard companyId="c-1" profile={{ employmentType }} />
				<p>Rendered</p>
			</QueryClientProvider>
		</I18nextProvider>
	);
};

describe("MyAvailabilityCard", () => {
	it("given_aPartTimer_when_shown_then_offersTheWeeksWithoutAnyEditing", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/me/availability": {
				status: 200,
				body: envelope({
					membershipId: "m-1",
					overrideWeeks: [],
					days: WEEKDAYS.map((day) => ({
						day,
						windows:
							day === "SAT" ? [{ startTime: "08:00", endTime: "12:00" }] : [],
					})),
				}),
			},
		});
		show("PART_TIME");

		expect(await screen.findByText("08:00–12:00")).toBeVisible();
		expect(screen.getByRole("button", { name: "Week" })).toHaveTextContent(
			"Default pattern"
		);
		expect(
			screen.queryByRole("button", { name: "Edit availability" })
		).not.toBeInTheDocument();
	});

	it("given_someoneNotPartTime_when_shown_then_rendersNothingAndAsksNothing", async () => {
		const calls = stubApi({});
		show("FULL_TIME");

		expect(await screen.findByText("Rendered")).toBeVisible();
		expect(screen.queryByRole("region")).not.toBeInTheDocument();
		expect(calls).toHaveLength(0);
	});
});
