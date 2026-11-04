import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { SetupChecklistCard } from "@/features/dashboard/SetupChecklistCard";
import { setupProgress } from "@/features/dashboard/setupChecklist";

const freshCompany = { branches: 0, departments: 0, jobTitles: 0, members: 1 };
const structured = { branches: 4, departments: 18, jobTitles: 36, members: 1 };

const meta = {
	title: "Features/Dashboard/SetupChecklistCard",
	component: SetupChecklistCard,
	decorators: [withMemoryRouter],
	parameters: { layout: "padded" },
	args: {
		counts: freshCompany,
		progress: setupProgress(freshCompany),
		canImportOrganisation: true,
		canImportPeople: true,
		onDismiss: fn(),
	},
} satisfies Meta<typeof SetupChecklistCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NewCompany: Story = {};

export const StructureImported: Story = {
	args: { counts: structured, progress: setupProgress(structured) },
};

export const PeopleImportOnly: Story = {
	args: { canImportOrganisation: false },
};
