import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import { storyCompany } from "@/features/people/storyCompany";
import { SCHEDULING_BRANCHES } from "@/features/scheduling/schedules/fixtures";
import {
	FIXTURE_FORTNIGHT,
	stripFixture,
} from "@/features/scheduling/timeline/fixtures";
import { StatusStrip } from "@/features/scheduling/timeline/StatusStrip";

const MANAGER = [
	"schedule:read",
	"schedule:publish",
	"schedule:generate",
	"schedule:delete",
];

beforeEach(() => {
	// Saturday before the fortnight shown: neither week has passed, so both may still be generated again.
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-10-10T09:00:00"));
	// The router scrolls to the top on load, which jsdom does not implement.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
	// No week is published elsewhere.
	stubApi({
		"GET /api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/published-week":
			{ status: 200, body: envelope({ periodStart: "", scheduleId: null }) },
	});
});

afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	vi.useRealTimers();
});

/** Renders the strip of the fixture fortnight in a table head, for someone holding `permissions` in company c-1. */
const renderStrip = (
	secondWeek: Parameters<typeof stripFixture>[0],
	permissions: ReadonlyArray<string> = MANAGER
): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	const Strip = (): ReactElement => (
		<table>
			<thead>
				<StatusStrip
					companyId="c-1"
					days={FIXTURE_FORTNIGHT}
					departmentId="d-1"
					view="two"
					{...stripFixture(secondWeek)}
				/>
			</thead>
		</table>
	);
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				{storyCompany(
					client,
					"c-1",
					SCHEDULING_BRANCHES
				)(Strip, { parameters: { permissions } } as never)}
			</QueryClientProvider>
		</I18nextProvider>
	);
};

/** Opens the menu of the piece whose name starts with `days` and gives its items' words. */
const menuItemsOf = async (days: string): Promise<Array<string | null>> => {
	await userEvent.click(
		await screen.findByRole("button", { name: new RegExp(`^${days}`) })
	);
	const menu = await screen.findByRole("menu");
	return within(menu)
		.getAllByRole("menuitem")
		.map((item) => item.textContent);
};

describe("StatusStrip", () => {
	/** Two published weeks are one run of days, so one band; each week keeps its own button, named by its days. */
	it("joins two published weeks into one band with a button per week", async () => {
		renderStrip("PUBLISHED");

		const first = await screen.findByRole("button", {
			name: /^Oct 12\s?–\s?18, 2026: Published$/,
		});
		const second = screen.getByRole("button", {
			name: /^Oct 19\s?–\s?25, 2026: Published$/,
		});
		expect(screen.getByRole("rowheader", { name: "Status" })).toBeVisible();
		const cells = screen.getAllByRole("cell");
		expect(cells.map((cell) => cell.getAttribute("colspan"))).toEqual(["14"]);
		expect(first).toHaveTextContent("Published");
		expect(second).toHaveTextContent("");
	});

	it("offers a piece to review its four actions, and Publish opens the publish dialog", async () => {
		renderStrip("GENERATED");

		expect(await menuItemsOf("Oct 19")).toEqual([
			"Review and edit these days",
			"Publish these days",
			"Generate these days again",
			"Delete these days",
		]);
		expect(
			screen.getByRole("group", { name: /^Actions for Oct 19\s?–\s?25, 2026$/ })
		).toBeVisible();
		await userEvent.click(
			screen.getByRole("menuitem", { name: "Publish these days" })
		);

		expect(
			await screen.findByRole("dialog", { name: "Publish this roster?" })
		).toBeVisible();
	});

	/** A published roster is changed or withdrawn, never deleted, whatever keys are held. */
	it("offers a published piece Withdraw and no Delete", async () => {
		renderStrip("PUBLISHED");

		expect(await menuItemsOf("Oct 19")).toEqual([
			"Review and edit these days",
			"Withdraw these days",
		]);
	});

	it("offers no Delete without schedule:delete", async () => {
		renderStrip("GENERATED", ["schedule:read", "schedule:publish"]);

		expect(await menuItemsOf("Oct 19")).toEqual([
			"Review and edit these days",
			"Publish these days",
		]);
	});

	/** Days no schedule covers read "No roster" in plain words, with nothing to press. */
	it("shows days with no roster as words, not a button", async () => {
		renderStrip(undefined);

		const cells = await screen.findAllByRole("cell");
		expect(cells.map((cell) => cell.getAttribute("colspan"))).toEqual([
			"7",
			"7",
		]);
		expect(cells[1]).toHaveTextContent("No roster");
		expect(within(cells[1]!).queryByRole("button")).not.toBeInTheDocument();
		expect(
			within(cells[1]!).getByTitle(/^Oct 19\s?–\s?25, 2026: No roster$/)
		).toBeVisible();
	});
});
