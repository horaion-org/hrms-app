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
import {
	generatedScheduleFixture,
	SCHEDULING_BRANCHES,
} from "@/features/scheduling/schedules/fixtures";
import { PublishDaysDialog } from "@/features/scheduling/timeline/PublishDaysDialog";
import {
	type TimelinePiece,
	timelinePiecesOf,
} from "@/features/scheduling/timeline/timelineRows";

beforeEach(() => {
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
});

/** The first `count` of two pieces to review: Monday to Wednesday (s-1) and Friday to Sunday (s-2) of one week. */
const piecesToReview = (count: number): Array<TimelinePiece> =>
	Object.values(
		timelinePiecesOf(
			[
				generatedScheduleFixture({
					status: "GENERATED",
					coveredFrom: "2026-10-12",
					coveredTo: "2026-10-14",
				}),
				generatedScheduleFixture({
					scheduleId: "s-2",
					status: "GENERATED",
					coveredFrom: "2026-10-16",
					coveredTo: "2026-10-18",
				}),
			],
			[]
		)
	).slice(0, count);

/** Opens the dialog over `pieces` in company c-1, for someone holding `permissions`. */
const renderDialog = (
	pieces: Array<TimelinePiece>,
	permissions = ["schedule:read", "schedule:publish"]
): { onClose: ReturnType<typeof vi.fn> } => {
	const onClose = vi.fn();
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	const Opened = (): ReactElement => (
		<PublishDaysDialog companyId="c-1" pieces={pieces} onClose={onClose} />
	);
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				{storyCompany(
					client,
					"c-1",
					SCHEDULING_BRANCHES
				)(Opened, { parameters: { permissions } } as never)}
			</QueryClientProvider>
		</I18nextProvider>
	);
	return { onClose };
};

describe("PublishDaysDialog", () => {
	it("opens the publish dialog at once for one piece", async () => {
		renderDialog(piecesToReview(1));

		expect(
			await screen.findByRole("dialog", { name: "Publish these days?" })
		).toHaveTextContent(/for its days \(Oct 12\s?–\s?14, 2026\)/);
	});

	/** Each piece is published on its own, so several are listed by their days and one is chosen. */
	it("lists several pieces by their days, and Publish opens the chosen one's dialog", async () => {
		renderDialog(piecesToReview(2));

		const list = await screen.findByRole("dialog", {
			name: "Publish which days?",
		});
		expect(list).toHaveTextContent(
			"These days are to review. Staff see them once you publish them."
		);
		expect(
			within(list)
				.getAllByRole("listitem")
				.map((item) => item.textContent)
		).toEqual([
			expect.stringMatching(/^Oct 12\s?–\s?14, 2026Publish$/),
			expect.stringMatching(/^Oct 16\s?–\s?18, 2026Publish$/),
		]);
		await userEvent.click(
			within(list).getByRole("button", {
				name: /^Publish Oct 16\s?–\s?18, 2026$/,
			})
		);

		expect(
			await screen.findByRole("dialog", { name: "Publish these days?" })
		).toHaveTextContent(/for its days \(Oct 16\s?–\s?18, 2026\)/);
	});

	/** Publish follows the strip menu's rule: without the publish key no piece may be put forward. */
	it("holds Publish back on a piece its menu would not offer to publish", async () => {
		renderDialog(piecesToReview(2), ["schedule:read"]);

		const list = await screen.findByRole("dialog", {
			name: "Publish which days?",
		});
		for (const button of within(list).getAllByRole("button", {
			name: /^Publish Oct/,
		}))
			expect(button).toBeDisabled();
	});

	it("says so when nothing is to review, and closes", async () => {
		const { onClose } = renderDialog([]);

		expect(
			await screen.findByText("Nothing is to review in the days shown.")
		).toBeVisible();
		// The dialog's own close button and the footer's are both "Close"; the footer's is the last.
		const closeButtons = screen.getAllByRole("button", { name: "Close" });
		await userEvent.click(closeButtons[closeButtons.length - 1]!);
		expect(onClose).toHaveBeenCalledOnce();
	});
});
