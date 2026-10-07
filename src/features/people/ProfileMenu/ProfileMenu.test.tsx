import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
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
