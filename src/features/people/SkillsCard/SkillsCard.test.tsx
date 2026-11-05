import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { MemberProfileDetail } from "@/features/people/api";
import { SkillsCard } from "@/features/people/SkillsCard";
import { storyCompany } from "@/features/people/storyCompany";
import {
	heldLicenceFixture,
	heldSkillFixture,
} from "@/features/skills/fixtures";

const SKILLS = "/api/v1/companies/c-1/member-profiles/m-1/skills";
const kent = {
	membershipId: "m-1",
	displayName: "Kent Chua",
	branchId: "b-1",
	departmentId: "d-1",
} as MemberProfileDetail;
const HELD = [
	heldSkillFixture({ skillId: "s-1", name: "Baking", proficiency: 6 }),
	heldSkillFixture({
		skillId: "s-2",
		name: "Forklift",
		proficiency: 9,
		notes: "Trains new starters",
	}),
	heldLicenceFixture({ expiresOn: "2001-01-31" }),
];

let calls: Array<{ method: string; path: string; body: unknown }> = [];
beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
	calls = stubApi({
		[`GET ${SKILLS}`]: { status: 200, body: envelope(HELD) },
		[`PUT ${SKILLS}`]: { status: 200, body: envelope(HELD.slice(1)) },
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

const show = (Story: () => ReactElement): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				{storyCompany(client, "c-1")(Story, {
					parameters: { permissions: [] },
				} as never)}
			</QueryClientProvider>
		</I18nextProvider>
	);
};
const names = (card: HTMLElement): Array<string> =>
	within(card)
		.getAllByRole("row")
		.slice(1)
		.map((row) => within(row).getAllByRole("cell")[0]?.textContent ?? "");

describe("SkillsCard", () => {
	it("lists them best first with notes, meters and the licence's expiry, read-only for someone who may not change them", async () => {
		show(() => (
			<SkillsCard changeable={false} companyId="c-1" profile={kent} />
		));

		const card = await screen.findByRole("region", {
			name: "Skills & proficiency (3)",
		});
		expect(names(card)).toEqual([
			"ForkliftTrains new starters",
			"Baking",
			"Security Officer Licence",
		]);
		expect(
			within(card).getByRole("img", { name: "Forklift: 9 out of 10" })
		).toBeVisible();
		expect(within(card).getByText("Not rated")).toBeVisible();
		expect(within(card).getByText("Expired")).toBeVisible();
		expect(
			within(card).getByRole("columnheader", { name: /Valid until/ })
		).toBeVisible();
		expect(
			within(card).queryByRole("button", { name: /Edit|Remove|Add/ })
		).toBeNull();
	});

	it("shows no expiry column when nothing they hold tracks expiry", async () => {
		stubApi({
			[`GET ${SKILLS}`]: { status: 200, body: envelope(HELD.slice(0, 2)) },
		});
		show(() => (
			<SkillsCard changeable={false} companyId="c-1" profile={kent} />
		));

		const card = await screen.findByRole("region", {
			name: "Skills & proficiency (2)",
		});
		expect(
			within(card).queryByRole("columnheader", { name: /Valid until/ })
		).toBeNull();
	});

	it("removes a skill only after asking, sending the rest of the set", async () => {
		const user = userEvent.setup();
		show(() => <SkillsCard changeable companyId="c-1" profile={kent} />);

		const card = await screen.findByRole("region", {
			name: "Skills & proficiency (3)",
		});
		await user.click(
			within(card).getByRole("button", { name: "Remove Baking" })
		);
		const confirm = await screen.findByRole("dialog", {
			name: "Remove Baking from Kent Chua?",
		});
		expect(calls.some((call) => call.method === "PUT")).toBe(false);
		await user.click(
			within(confirm).getByRole("button", { name: "Remove skill" })
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});
		expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
			skills: [
				{
					name: "Forklift",
					proficiency: 9,
					notes: "Trains new starters",
					issuedOn: null,
					expiresOn: null,
				},
				{
					name: "Security Officer Licence",
					proficiency: null,
					notes: null,
					issuedOn: "2026-03-01",
					expiresOn: "2001-01-31",
				},
			],
		});
	});

	it("opens a held skill to change it", async () => {
		const user = userEvent.setup();
		show(() => <SkillsCard changeable companyId="c-1" profile={kent} />);

		const card = await screen.findByRole("region", {
			name: "Skills & proficiency (3)",
		});
		await user.click(
			within(card).getByRole("button", { name: "Edit Forklift" })
		);
		const dialog = await screen.findByRole("dialog", { name: "Edit skill" });
		expect(
			within(dialog).getByRole("slider", { name: "Proficiency" })
		).toHaveValue("9");
		expect(within(dialog).getByRole("textbox", { name: "Notes" })).toHaveValue(
			"Trains new starters"
		);
	});

	it("is not drawn when the API refuses the skills", async () => {
		const refused = stubApi({
			[`GET ${SKILLS}`]: problemReply(403, "AUTHORIZATION_DENIED"),
		});
		show(() => <SkillsCard changeable companyId="c-1" profile={kent} />);

		await vi.waitFor(() => {
			expect(refused.length).toBeGreaterThan(0);
		});
		await vi.waitFor(() => {
			expect(screen.queryByText("Loading skills…")).toBeNull();
		});
		expect(screen.queryByRole("region")).toBeNull();
	});
});
