import type { ReactElement } from "react";
import { composeStories } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
	type RenderResult,
	render as renderPlain,
	screen,
	waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
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
const MEMBER_LEAVE_OPTIONS =
	"GET /api/v1/companies/c-1/member-profiles/m-aisha/leave-requests/leave-options";
const OWN_ROSTERED_DAYS =
	"GET /api/v1/companies/c-1/me/leave-requests/rostered-days";
const OWN_LEAVE_OPTIONS =
	"GET /api/v1/companies/c-1/me/leave-requests/leave-options";
const optionsReply = (
	leaveTypes = LEAVE_TYPE_FIXTURES
): { status: number; body: unknown } => ({
	status: 200,
	body: envelope({ leaveTypes }),
});
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
	stubApi({
		[MEMBER_ROSTERED_DAYS]: problemReply(404, "SOMETHING_ELSE"),
		[MEMBER_LEAVE_OPTIONS]: optionsReply(),
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveApplyForm
				recording
				busy={false}
				companyId="c-1"
				employees={{ search: "", onSearch: vi.fn(), options: [aisha] }}
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
	stubApi({
		[OWN_ROSTERED_DAYS]: { status: 200, body: envelope([]) },
		[OWN_LEAVE_OPTIONS]: optionsReply(),
	});
	const onCreate = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveApplyForm
				busy={false}
				companyId="c-1"
				onClose={vi.fn()}
				onCreate={onCreate}
			/>
		</I18nextProvider>
	);

	expect(screen.getByRole("dialog", { name: "Apply for leave" })).toBeVisible();
	expect(
		screen.queryByRole("searchbox", { name: "Search employees" })
	).not.toBeInTheDocument();
	await waitFor(() => {
		expect(
			screen.getByRole("button", { name: "Submit request" })
		).toBeEnabled();
	});
	await userEvent.click(screen.getByRole("button", { name: "Submit request" }));

	expect(onCreate).toHaveBeenCalledOnce();
	expect(onCreate.mock.calls[0]?.[0]).toBeNull();
});

it("given_someoneElse_when_noPersonIsChosenYet_then_theTypeWaitsForThem", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveApplyForm
				busy={false}
				companyId="c-1"
				employees={{ search: "", onSearch: vi.fn(), options: [aisha] }}
				onClose={vi.fn()}
				onCreate={vi.fn()}
			/>
		</I18nextProvider>
	);

	expect(screen.getByRole("button", { name: "Type" })).toBeDisabled();
	expect(screen.getByText("Choose a person first")).toBeVisible();
});

it("given_aPersonChosen_when_theirTypesArrive_then_onlyThoseAreOffered", async () => {
	const user = userEvent.setup();
	const sick = LEAVE_TYPE_FIXTURES.find((type) => type.code === "SICK")!;
	stubApi({
		[MEMBER_ROSTERED_DAYS]: { status: 200, body: envelope([]) },
		[MEMBER_LEAVE_OPTIONS]: optionsReply([sick]),
	});
	const onCreate = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveApplyForm
				busy={false}
				companyId="c-1"
				employees={{ search: "", onSearch: vi.fn(), options: [aisha] }}
				onClose={vi.fn()}
				onCreate={onCreate}
			/>
		</I18nextProvider>
	);

	await user.click(screen.getByRole("button", { name: "Employee" }));
	await user.click(await screen.findByRole("option", { name: /Aisha Rahman/ }));
	await waitFor(() => {
		expect(
			screen.getByRole("button", { name: "Submit request" })
		).toBeEnabled();
	});
	await user.click(screen.getByRole("button", { name: "Submit request" }));

	expect(onCreate).toHaveBeenCalledWith(
		"m-aisha",
		expect.objectContaining({ leaveType: "SICK" })
	);
});

it("given_noTypeAppliesToThePerson_when_opened_then_saysSoAndHoldsSubmit", async () => {
	stubApi({
		[OWN_ROSTERED_DAYS]: { status: 200, body: envelope([]) },
		[OWN_LEAVE_OPTIONS]: optionsReply([]),
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveApplyForm
				busy={false}
				companyId="c-1"
				onClose={vi.fn()}
				onCreate={vi.fn()}
			/>
		</I18nextProvider>
	);

	expect(
		await screen.findByText(/No leave types apply to you yet/)
	).toBeVisible();
	expect(screen.getByRole("button", { name: "Submit request" })).toBeDisabled();
});

it("given_theTypesBeingRead_when_opened_then_saysTheyAreLoadingAndHoldsSubmit", () => {
	stubApi({
		[OWN_ROSTERED_DAYS]: { status: 200, body: envelope([]) },
		[OWN_LEAVE_OPTIONS]: optionsReply(),
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveApplyForm
				busy={false}
				companyId="c-1"
				onClose={vi.fn()}
				onCreate={vi.fn()}
			/>
		</I18nextProvider>
	);

	const type = screen.getByRole("button", { name: "Type" });
	expect(type).toHaveTextContent("Loading leave types…");
	expect(type).toBeDisabled();
	expect(screen.getByRole("button", { name: "Submit request" })).toBeDisabled();
});

it("given_theTypesFailToLoad_when_retried_then_readsThemAgain", async () => {
	const user = userEvent.setup();
	const calls = stubApi({
		[OWN_ROSTERED_DAYS]: { status: 200, body: envelope([]) },
		[OWN_LEAVE_OPTIONS]: [problemReply(404, "SOMETHING_ELSE"), optionsReply()],
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveApplyForm
				busy={false}
				companyId="c-1"
				onClose={vi.fn()}
				onCreate={vi.fn()}
			/>
		</I18nextProvider>
	);

	expect(await screen.findByRole("alert")).toHaveTextContent(
		"We couldn’t load the leave types."
	);
	expect(screen.getByRole("button", { name: "Submit request" })).toBeDisabled();
	await user.click(screen.getByRole("button", { name: "Try again" }));

	expect(
		await screen.findByRole("button", { name: "Submit request" })
	).toBeEnabled();
	expect(
		calls.filter(
			(call) =>
				call.path === "/api/v1/companies/c-1/me/leave-requests/leave-options"
		)
	).toHaveLength(2);
});
