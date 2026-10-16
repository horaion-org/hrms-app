import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { ApiProblemError } from "@/common/problem";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import { EMPTY_PROFILE } from "@/features/people/profileFormSchema";
import { ProfileForm } from "@/features/people/ProfileForm";
import { storyCompany } from "@/features/people/storyCompany";
import type { Workspace } from "@/features/workspace/api";

const COMPANY = "story-company";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const ALL = [
	"member_profile:create",
	"job_title:read",
	"access_role:read",
	"access_role:assign",
];

/** The same Department name in two Branches, told apart by the Branch. */
const BRANCHES: Workspace["companies"][number]["branches"] = [
	{
		uuid: "b-1",
		name: "Orchard Road",
		status: "ACTIVE",
		country: "SG",
		permissions: [],
		departments: [
			{ uuid: "d-1", name: "Kitchen", status: "ACTIVE", permissions: [] },
		],
	},
	{
		uuid: "b-2",
		name: "Bukit Bintang",
		status: "ACTIVE",
		country: "MY",
		permissions: [],
		departments: [
			{ uuid: "d-2", name: "Kitchen", status: "ACTIVE", permissions: [] },
		],
	},
];

const meta = {
	title: "Features/People/ProfileForm",
	component: ProfileForm,
	parameters: { layout: "padded", permissions: ALL },
	args: {
		companyId: COMPANY,
		title: "Add employee",
		description:
			"Set up employee details to manage roles, shifts, and availability.",
		initial: EMPTY_PROFILE,
		onSubmit: fn(() => Promise.resolve()),
		onCancel: fn(),
	},
	decorators: [storyCompany(client, COMPANY, BRANCHES), storyProviders(client)],
	beforeEach: (): (() => void) =>
		stubStoryApi(
			[
				{
					path: "/job-titles",
					content: [
						{
							jobTitleId: "j-1",
							branchId: "b-1",
							branchName: "Orchard Road",
							departmentId: "d-1",
							departmentName: "Kitchen",
							name: "Chef",
							status: "ACTIVE",
						},
					],
				},
				{
					path: "/me/colleagues",
					content: [
						{
							membershipId: "m-1",
							displayName: "Marcus Lim",
							status: "ACTIVE",
						},
					],
				},
				{
					path: "/access-roles",
					content: [
						{
							accessRoleId: "r-1",
							name: "Supervisor",
							protectedRole: false,
							status: "ACTIVE",
							permissions: ["member_profile:read"],
							holderCount: 0,
						},
					],
				},
			],
			false,
			client
		),
} satisfies Meta<typeof ProfileForm>;
export default meta;
type Story = StoryObj<typeof meta>;

const confirm = async (canvas: HTMLElement): Promise<void> => {
	await userEvent.click(
		await within(canvas).findByRole("button", { name: "Confirm" })
	);
};
const fillIn = async (canvas: HTMLElement): Promise<void> => {
	const page = within(canvas.ownerDocument.body);
	await userEvent.type(
		await page.findByRole("textbox", { name: "Full name" }),
		"Priya Nair"
	);
	await userEvent.type(
		page.getByRole("textbox", { name: "Email address" }),
		"priya@company.com"
	);
	const department = page.getByRole("button", { name: /^Department/ });
	// Enabled once the workspace has loaded.
	await waitFor(async () => {
		await expect(department).toBeEnabled();
	});
	await userEvent.click(department);
	await userEvent.click(
		await page.findByRole("option", { name: "Orchard Road › Kitchen" })
	);
};

export const Empty: Story = {};

/** A Department sets the phone's country code and offers its job titles. */
export const DepartmentChosen: Story = {
	play: async ({ canvasElement }) => {
		await fillIn(canvasElement);
	},
};

/** For someone who may not search people, nor read and assign roles. */
export const WithoutManagerOrRole: Story = {
	parameters: {
		permissions: ["member_profile:create"],
	},
};

export const Invalid: Story = {
	play: async ({ canvasElement }) => {
		await confirm(canvasElement);
	},
};

export const Submitting: Story = {
	args: { onSubmit: fn(() => new Promise<void>(() => {})) },
	play: async ({ canvasElement }) => {
		await fillIn(canvasElement);
		await confirm(canvasElement);
	},
};

export const EmailTaken: Story = {
	args: {
		onSubmit: fn(() =>
			Promise.reject(
				new ApiProblemError({
					message: "Refused",
					status: 409,
					errorCode: "MEMBER_EMAIL_ALREADY_REGISTERED",
					fieldErrors: [],
					reason: "http",
				})
			)
		),
	},
	play: Submitting.play,
};

export const FormError: Story = {
	args: { onSubmit: fn(() => Promise.reject(new Error("Unreachable"))) },
	play: Submitting.play,
};

/** Changing an existing person who has logged in: their email address is kept. */
export const Editing: Story = {
	parameters: {
		permissions: [
			"member_profile:update",
			"job_title:read",
			"access_role:read",
			"access_role:assign",
		],
	},
	args: {
		title: undefined,
		description: undefined,
		initial: {
			...EMPTY_PROFILE,
			displayName: "Kent Chua",
			email: "kent.chua@company.com",
			phone: "+6583247931",
			employmentType: "FULL_TIME",
			hireDate: "2024-01-15",
			departmentId: "d-1",
			jobTitleId: "j-1",
			accessRoleId: "r-1",
			status: "ACTIVE",
		},
		edit: {
			employeeCode: "EMP-10392",
			emailEditable: false,
			roleEditable: true,
			rolePlace: { branchId: "b-1", departmentId: "d-1" },
			otherRoles: ["Admin"],
			header: (actions) => (
				<div className="flex justify-end gap-3">{actions}</div>
			),
		},
	},
};

export const BranchRoleWithoutDepartment: Story = {
	parameters: Editing.parameters,
	args: {
		title: undefined,
		description: undefined,
		initial: {
			...EMPTY_PROFILE,
			displayName: "Kent Chua",
			email: "kent.chua@company.com",
			accessRoleId: "r-1",
			status: "ACTIVE",
		},
		edit: {
			employeeCode: "EMP-10392",
			emailEditable: false,
			roleEditable: true,
			rolePlace: { branchId: "b-1" },
			otherRoles: [],
			header: (actions) => (
				<div className="flex justify-end gap-3">{actions}</div>
			),
		},
	},
};
