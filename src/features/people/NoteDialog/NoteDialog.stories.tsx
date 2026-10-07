import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import { NoteDialog } from "@/features/people/NoteDialog";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const meta = {
	title: "Features/People/NoteDialog",
	component: NoteDialog,
	args: {
		companyId: "story-company",
		membershipId: "m-1",
		name: "Kent Chua",
		onClose: fn(),
	},
	decorators: [storyProviders(client)],
	// Saving fails, so the dialog's alert shows; `pending` keeps it saving.
	beforeEach: ({ parameters }): (() => void) =>
		stubStoryApi([], Boolean(parameters["pending"]), client),
} satisfies Meta<typeof NoteDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Add: Story = {};

export const Edit: Story = {
	args: {
		editing: {
			noteId: "n-1",
			body: "Reliable and punctual.\nGreat with pastry.",
			author: { membershipId: "m-9", displayName: "Faris Ahmad" },
			createdAt: "2026-05-16T14:36:00Z",
			updatedAt: "2026-05-16T14:36:00Z",
			edited: false,
		},
	},
};
