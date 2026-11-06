import type { ReactElement } from "react";
import { composeStories } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
	type RenderResult,
	render as renderPlain,
	screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { problemReply, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import { rosteredDaysQuery } from "@/features/leave/api";
import { LEAVE_TYPE_FIXTURES } from "@/features/leave/fixtures";
import { LeaveApplyForm } from "./LeaveApplyForm";
import * as stories from "./LeaveApplyForm.stories";

/** The dialog reads rostered days through the query cache. */
const render = (ui: ReactElement): RenderResult => {
	const client = new QueryClient();
	return renderPlain(ui, {
		wrapper: ({ children }) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		),
	});
};

const { ForSomeone } = composeStories(stories);

const MEMBER_ROSTERED_DAYS =
	"GET /api/v1/companies/c-1/member-profiles/m-aisha/leave-requests/rostered-days";
const aisha = {
	membershipId: "m-aisha",
	displayName: "Aisha Rahman",
	employeeCode: "EMP-10517",
};

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

it("given_recording_when_theRosterCannotBeRead_then_holdsSubmitAndOffersARetry", async () => {
	const user = userEvent.setup();
	stubApi({ [MEMBER_ROSTERED_DAYS]: problemReply(404, "SOMETHING_ELSE") });
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveApplyForm
				recording
				busy={false}
				companyId="c-1"
				employees={{ search: "", onSearch: vi.fn(), options: [aisha] }}
				leaveTypes={LEAVE_TYPE_FIXTURES}
				onClose={vi.fn()}
				onCreate={vi.fn()}
			/>
		</I18nextProvider>
	);

	await user.click(screen.getByRole("button", { name: "Employee" }));
	await user.click(await screen.findByRole("option", { name: /Aisha Rahman/ }));

	expect(
		await screen.findByText(/couldn’t check the roster/)
	).toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
	expect(
		screen.getByRole("button", { name: "Record approved leave" })
	).toBeDisabled();
});

it("given_noPersonChosen_when_theReadersOwnDaysAreCached_then_theyAreNotShown", () => {
	const client = new QueryClient();
	const { queryKey } = rosteredDaysQuery("c-1", {
		start: dayjs().format("YYYY-MM-DD"),
		end: dayjs().format("YYYY-MM-DD"),
	});
	client.setQueryData(queryKey, [{ day: "2026-06-03", minutes: 480 }]);
	renderPlain(
		<QueryClientProvider client={client}>
			<I18nextProvider i18n={authTestI18n}>
				<LeaveApplyForm
					recording
					busy={false}
					companyId="c-1"
					employees={{ search: "", onSearch: vi.fn(), options: [] }}
					leaveTypes={LEAVE_TYPE_FIXTURES}
					onClose={vi.fn()}
					onCreate={vi.fn()}
				/>
			</I18nextProvider>
		</QueryClientProvider>
	);

	expect(screen.queryByText(/rostered on/)).not.toBeInTheDocument();
});

it("given_someoneElse_when_noPersonIsChosen_then_holdsSubmitBack", () => {
	render(<ForSomeone />);

	expect(screen.getByRole("dialog", { name: "Apply leave" })).toBeVisible();
	expect(screen.getByRole("button", { name: "Submit request" })).toBeDisabled();
});

it("given_theCallerThemself_when_submitted_then_appliesWithNoPerson", async () => {
	const onCreate = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveApplyForm
				busy={false}
				leaveTypes={LEAVE_TYPE_FIXTURES}
				onClose={vi.fn()}
				onCreate={onCreate}
			/>
		</I18nextProvider>
	);

	expect(screen.getByRole("dialog", { name: "Apply for leave" })).toBeVisible();
	expect(
		screen.queryByRole("searchbox", { name: "Search employees" })
	).not.toBeInTheDocument();
	await userEvent.click(screen.getByRole("button", { name: "Submit request" }));

	expect(onCreate).toHaveBeenCalledOnce();
	expect(onCreate.mock.calls[0]?.[0]).toBeNull();
});
