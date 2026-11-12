import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi, type StubReply } from "@/common/testing/stubApi";
import * as stories from "./StepChoices.stories";

const {
	AnyoneWhoCan,
	AllOfThesePeople,
	AnyOfThesePeople,
	OnlyThesePeopleNoneEligible,
} = composeStories(stories);

const ELIGIBLE =
	"GET /api/v1/companies/story-company/approval-flows/eligible-approvers";
const people = (content: Array<unknown>): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements: content.length } }),
});
const PRIYA = {
	membershipId: "m-5",
	displayName: "Priya Nair",
	status: "ACTIVE",
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

it("given_anyoneWhoCanDecides_when_shown_then_asksForNoPeople", () => {
	const calls = stubApi({ [ELIGIBLE]: people([PRIYA]) });
	render(<AnyoneWhoCan />);

	expect(
		screen.getByRole("radio", {
			name: /Anyone who can publish in Front Office/,
		})
	).toBeChecked();
	expect(
		screen.queryByRole("radiogroup", { name: "How many of them" })
	).toBeNull();
	expect(calls).toHaveLength(0);
});

it("given_onlyNamedPeople_when_shown_then_listsThemAndHowManyDecide", () => {
	stubApi({ [ELIGIBLE]: people([PRIYA]) });
	render(<AllOfThesePeople />);

	expect(
		screen.getByRole("radio", { name: /Only these people/ })
	).toBeChecked();
	expect(screen.getByText("Siti Rahman")).toBeInTheDocument();
	expect(screen.getByRole("radio", { name: "All of them" })).toBeChecked();
});

it("given_anyoneWhoCanDecides_when_onlyThesePeopleIsChosen_then_asksWhoAndHowMany", async () => {
	stubApi({ [ELIGIBLE]: people([PRIYA]) });
	const user = userEvent.setup();
	render(<AnyoneWhoCan />);

	await user.click(screen.getByRole("radio", { name: /Only these people/ }));

	expect(
		screen.getByRole("radiogroup", { name: "How many of them" })
	).toBeVisible();
	expect(screen.getByRole("radio", { name: "Any one of them" })).toBeChecked();
});

it("given_onlyThesePeople_when_pickerOpened_then_listsEligibleApproversForTheSubjectAndDepartment", async () => {
	const calls = stubApi({ [ELIGIBLE]: people([PRIYA]) });
	const user = userEvent.setup();
	// A department no other test asks about: the stories share one query client.
	render(<AnyOfThesePeople departmentId="guarding" />);

	await user.click(screen.getByRole("button", { name: "People" }));

	expect(
		await screen.findByRole("option", { name: "Priya Nair" })
	).toBeInTheDocument();
	expect(
		screen.getByText("Showing people who can approve")
	).toBeInTheDocument();
	const query = new URLSearchParams(calls[0]?.search);
	expect(query.get("subjectType")).toBe("SCHEDULE_PUBLICATION");
	expect(query.get("departmentId")).toBe("guarding");
});

it("given_nobodyEligible_when_pickerOpened_then_saysToGivePermissionsInAccessRoles", async () => {
	stubApi({ [ELIGIBLE]: people([]) });
	const user = userEvent.setup();
	render(<OnlyThesePeopleNoneEligible />);

	await user.click(screen.getByRole("button", { name: "People" }));

	expect(
		await screen.findByText(
			"Nobody can approve here yet. Give people both permissions in Access roles first."
		)
	).toBeInTheDocument();
	expect(screen.queryByText("Showing people who can approve")).toBeNull();
});

it("given_searchWithNoMatch_when_typed_then_saysNoOneWhoCanApproveMatches", async () => {
	stubApi({ [ELIGIBLE]: people([]) });
	const user = userEvent.setup();
	render(<OnlyThesePeopleNoneEligible />);

	await user.click(screen.getByRole("button", { name: "People" }));
	await user.type(screen.getByPlaceholderText("Search people"), "Zed");

	expect(
		await screen.findByText(
			"No one who can approve matches your search. If someone is missing, give them both permissions in Access roles first."
		)
	).toBeInTheDocument();
});
