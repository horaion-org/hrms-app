import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { storyProviders } from "@/features/organisation/storyApi";
import { ProfileMenu } from "@/features/people/ProfileMenu";
import { storyCompany } from "@/features/people/storyCompany";

const COMPANY = "story-company";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

const meta = {
	title: "Features/People/ProfileMenu",
	component: ProfileMenu,
	parameters: { layout: "padded" },
	args: {
		companyId: COMPANY,
		self: false,
		profile: {
			membershipId: "m-1",
			employeeCode: "EMP-10392",
			displayName: "Kent Chua",
			email: "kent.chua@company.com",
			phone: "+6583247931",
			branchId: "b-1",
			branchName: "Orchard",
			departmentId: "d-1",
			departmentName: "Food & Beverage",
			jobTitleId: "j-1",
			jobTitleName: "Pastry chef",
			status: "ACTIVE",
			dateOfBirth: "1987-03-22",
			employmentType: "FULL_TIME",
			hireDate: "2024-01-15",
			probationEndDate: null,
			endDate: null,
			reportsTo: null,
			invitationPending: true,
		},
	},
	decorators: [storyCompany(client, COMPANY), storyProviders(client)],
} satisfies Meta<typeof ProfileMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Deactivating asks first and says what it does. */
export const ConfirmDeactivate: Story = {
	play: async ({ canvasElement }) => {
		const page = within(canvasElement.ownerDocument.body);
		await userEvent.click(
			await page.findByRole("button", { name: "More actions for Kent Chua" })
		);
		await userEvent.click(
			await page.findByRole("menuitem", { name: "Deactivate" })
		);
		await expect(
			await page.findByRole("dialog", { name: "Deactivate Kent Chua?" })
		).toBeVisible();
	},
};

/** An inactive person who has logged in: only reactivating applies. */
export const Inactive: Story = {
	args: {
		profile: {
			...meta.args.profile,
			status: "INACTIVE",
			invitationPending: false,
		},
	},
};
