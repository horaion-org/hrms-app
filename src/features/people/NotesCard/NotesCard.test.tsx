import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { MemberProfileDetail } from "@/features/people/api";
import { NotesCard, type NotesCardProps } from "@/features/people/NotesCard";
import { storyCompany } from "@/features/people/storyCompany";

const NOTES = "GET /api/v1/companies/c-1/member-profiles/m-1/notes";
const kent = {
	membershipId: "m-1",
	displayName: "Kent Chua",
	branchId: "b-1",
	departmentId: "d-1",
} as MemberProfileDetail;
const note = {
	noteId: "n-1",
	body: "Reliable.",
	author: { membershipId: "m-9", displayName: "Faris Ahmad" },
	createdAt: new Date(2026, 4, 16, 22, 36).toISOString(),
	updatedAt: new Date(2026, 4, 16, 22, 36).toISOString(),
	edited: false,
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

/** Renders the card in company c-1, holding `permissions` company-wide. */
const show = (
	permissions: Array<string>,
	props: Partial<NotesCardProps> = {}
): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	// The card renders once the router has loaded; "Loaded" marks that.
	const Story = (): ReactElement => (
		<>
			<NotesCard actions="menu" companyId="c-1" profile={kent} {...props} />
			<span>Loaded</span>
		</>
	);
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				{storyCompany(client, "c-1")(Story, {
					parameters: { permissions },
				} as never)}
			</QueryClientProvider>
		</I18nextProvider>
	);
};

describe("NotesCard", () => {
	it("is not drawn, and asks for nothing, without the read key", async () => {
		const calls = stubApi({});
		show(["member_profile:read"]);

		await screen.findByText("Loaded");
		expect(screen.queryByRole("region")).toBeNull();
		expect(calls).toEqual([]);
	});

	it("shows the count, says when there are none, and offers adding with its key", async () => {
		stubApi({
			[NOTES]: {
				status: 200,
				body: envelope({ content: [], page: { totalElements: 0 } }),
			},
		});
		show(["member_note:read", "member_note:create"]);

		const card = await screen.findByRole("region", { name: "Notes (0)" });
		expect(await within(card).findByText("No notes yet.")).toBeVisible();
		await userEvent.click(
			within(card).getByRole("button", { name: "Add note" })
		);
		expect(
			await screen.findByRole("dialog", { name: "Add note" })
		).toBeVisible();
	});

	it("lists the notes, offering nothing without the keys to change them", async () => {
		stubApi({
			[NOTES]: {
				status: 200,
				body: envelope({ content: [note], page: { totalElements: 1 } }),
			},
		});
		show(["member_note:read"]);

		const card = await screen.findByRole("region", { name: "Notes (1)" });
		expect(within(card).getAllByRole("listitem")).toHaveLength(1);
		expect(within(card).queryByRole("button")).toBeNull();
	});

	it("is not drawn when the API refuses them, as without the read key", async () => {
		const calls = stubApi({
			[NOTES]: problemReply(403, "AUTHORIZATION_DENIED"),
		});
		show(["member_note:read", "member_note:create"]);

		await screen.findByText("Loaded");
		await vi.waitFor(() => {
			expect(calls).toHaveLength(1);
		});
		await vi.waitFor(() => {
			expect(screen.queryByRole("region")).toBeNull();
		});
	});

	it("says when they can't be loaded", async () => {
		stubApi({});
		show(["member_note:read"]);

		expect(
			await screen.findByText("We couldn’t load the notes. Try again.")
		).toHaveAttribute("role", "alert");
	});
});
