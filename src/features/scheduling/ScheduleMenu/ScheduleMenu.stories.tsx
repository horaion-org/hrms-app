import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import { storyProviders } from "@/features/organisation/storyApi";
import { storyCompany } from "@/features/people/storyCompany";
import { ScheduleMenu } from "@/features/scheduling/ScheduleMenu";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";

const COMPANY = "story-company";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

const meta = {
	title: "Features/Scheduling/ScheduleMenu",
	component: ScheduleMenu,
	parameters: {
		layout: "padded",
		permissions: ["schedule:read", "schedule:delete"],
	},
	args: {
		companyId: COMPANY,
		schedule: generatedScheduleFixture({ status: "GENERATED" }),
	},
	decorators: [storyCompany(client, COMPANY), storyProviders(client)],
} satisfies Meta<typeof ScheduleMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

const openDelete = async (canvasElement: HTMLElement): Promise<HTMLElement> => {
	const page = within(canvasElement.ownerDocument.body);
	await userEvent.click(
		await page.findByRole("button", {
			name: "More actions for Front Office - Week 42",
		})
	);
	await userEvent.click(await page.findByRole("menuitem", { name: "Delete" }));
	return page.findByRole("dialog", { name: "Delete Front Office - Week 42?" });
};

export const Default: Story = {};

/** On the roster header the menu also downloads the roster as a spreadsheet. */
export const WithExport: Story = { args: { withExport: true } };

/** On the roster header: the page's own items first, then Export and Delete. */
export const WithRosterItems: Story = {
	args: {
		withExport: true,
		children: (
			<>
				<OverflowMenuItem>Reject</OverflowMenuItem>
				<OverflowMenuItem>View setup</OverflowMenuItem>
				<OverflowMenuItem>Details</OverflowMenuItem>
			</>
		),
	},
};

/** Deleting asks first, in red, naming the department and week. */
export const ConfirmDelete: Story = {
	play: async ({ canvasElement }) => {
		await expect(await openDelete(canvasElement)).toBeVisible();
	},
};

/** While the schedule is being generated, the dialog says why it can't be deleted yet. */
export const BeingGenerated: Story = {
	args: { schedule: generatedScheduleFixture() },
	play: async ({ canvasElement }) => {
		const dialog = await openDelete(canvasElement);
		await expect(
			within(dialog).getByRole("button", { name: "Delete schedule" })
		).toBeDisabled();
	},
};
