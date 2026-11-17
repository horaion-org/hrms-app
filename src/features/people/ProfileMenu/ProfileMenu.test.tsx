import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import {
	envelope,
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { MemberProfileDetail } from "@/features/people/api";
import {
	ProfileMenu,
	type ProfileMenuProps,
} from "@/features/people/ProfileMenu";

const kent: MemberProfileDetail = {
	membershipId: "m-1",
	employeeCode: "EMP-10392",
	displayName: "Kent Chua",
	email: "kent.chua@company.com",
	phone: null,
	branchId: "b-1",
	branchName: "Orchard",
	departmentId: "d-1",
	departmentName: "Kitchen",
	jobTitleId: null,
	jobTitleName: null,
	status: "ACTIVE",
	dateOfBirth: null,
	employmentType: null,
	hireDate: null,
	probationEndDate: null,
	endDate: null,
	reportsTo: null,
	invitationPending: false,
};

const show = async (props: Partial<ProfileMenuProps> = {}): Promise<void> => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={new QueryClient()}>
				<MemoryRouterHarness>
					<ProfileMenu companyId="c-1" profile={kent} self={false} {...props} />
					<span>Loaded</span>
				</MemoryRouterHarness>
			</QueryClientProvider>
		</I18nextProvider>
	);
	// The router renders once loaded.
	await screen.findAllByText("Loaded");
};

const items = async (): Promise<Array<string | null>> => {
	await userEvent.click(
		await screen.findByRole("button", { name: "More actions for Kent Chua" })
	);
	return (await screen.findAllByRole("menuitem")).map(
		(item) => item.textContent
	);
};

describe("ProfileMenu", () => {
	it("offers to deactivate an active person and reactivate an inactive one", async () => {
		await show();
		expect(await items()).toEqual(["Deactivate"]);
	});

	it("offers to reactivate an inactive person, and to resend a pending invitation", async () => {
		await show({
			profile: { ...kent, status: "INACTIVE", invitationPending: true },
		});
		expect(await items()).toEqual(["Reactivate", "Resend invitation"]);
	});

	it("never offers to deactivate yourself", async () => {
		await show({ self: true, profile: { ...kent, invitationPending: true } });
		expect(await items()).toEqual(["Resend invitation"]);
	});

	it("is not drawn when nothing applies", async () => {
		await show({ self: true });

		expect(
			screen.queryByRole("button", { name: /More actions/ })
		).not.toBeInTheDocument();
	});

	it("asks before deactivating, saying what it does", async () => {
		await show();
		await items();
		await userEvent.click(screen.getByRole("menuitem", { name: "Deactivate" }));

		const dialog = await screen.findByRole("dialog", {
			name: "Deactivate Kent Chua?",
		});
		expect(dialog).toHaveTextContent(
			"Kent Chua will lose access to Horaion immediately and won’t be able to log in until they’re reactivated."
		);
	});
});

describe("ProfileMenu default access", () => {
	const RECIPIENT = "/api/v1/companies/c-1/default-access-recipients";
	const receiving = (receivesDefaultAccess: boolean): StubReply => ({
		status: 200,
		body: envelope({
			companyMembershipId: "m-1",
			receivesDefaultAccess,
			receivingSince: null,
		}),
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

	it("offers nothing about default access to a reader who can't change access", async () => {
		const calls = stubApi({});
		await show();

		expect(await items()).toEqual(["Deactivate"]);
		expect(calls).toHaveLength(0);
	});

	it("lets someone who may change access stop it, after asking", async () => {
		const calls = stubApi({
			[`GET ${RECIPIENT}/m-1`]: receiving(true),
			[`DELETE ${RECIPIENT}/m-1`]: { status: 204 },
		});
		await show({ canChangeDefaultAccess: true });

		await waitFor(async () => {
			expect(await items()).toEqual(["Deactivate", "Stop default access"]);
		});
		await userEvent.click(
			screen.getByRole("menuitem", { name: "Stop default access" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Stop default access for Kent Chua?",
		});
		expect(dialog).toHaveTextContent(
			"Kent Chua keeps their own things and any role given by hand, and loses what defaults give."
		);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Stop default access" })
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
	});

	it("gives it to an active person not receiving it, and explains a refusal", async () => {
		const calls = stubApi({
			[`GET ${RECIPIENT}/m-1`]: receiving(false),
			[`POST ${RECIPIENT}`]: problemReply(
				400,
				"INVALID_DEFAULT_ACCESS_RECIPIENT"
			),
		});
		await show({ canChangeDefaultAccess: true });

		await waitFor(async () => {
			expect(await items()).toEqual(["Deactivate", "Give default access"]);
		});
		await userEvent.click(
			screen.getByRole("menuitem", { name: "Give default access" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Give default access to Kent Chua?",
		});
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Give default access" })
		);

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"Someone you chose has left the company. Untick them and try again."
		);
		expect(calls.find((call) => call.method === "POST")?.body).toEqual({
			companyMembershipIds: ["m-1"],
		});
	});

	it("never offers to give it to an inactive person", async () => {
		const calls = stubApi({ [`GET ${RECIPIENT}/m-1`]: receiving(false) });
		await show({
			canChangeDefaultAccess: true,
			profile: { ...kent, status: "INACTIVE" },
		});

		await waitFor(() => {
			expect(calls).toHaveLength(1);
		});
		expect(await items()).toEqual(["Reactivate"]);
	});
});
