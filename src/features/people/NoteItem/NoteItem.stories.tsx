import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { NoteItem } from "@/features/people/NoteItem";
import "@/common/i18n";

const meta = {
	title: "Features/People/NoteItem",
	component: NoteItem,
	parameters: { layout: "padded" },
	args: {
		actions: "menu",
		note: {
			noteId: "n-1",
			body: "Reliable and punctual. Shows great attention to detail in bakery preparation.",
			author: { membershipId: "m-9", displayName: "Faris Ahmad" },
			createdAt: "2026-05-16T14:36:00Z",
			updatedAt: "2026-05-16T14:36:00Z",
			edited: false,
		},
		onEdit: fn(),
		onDelete: fn(),
	},
} satisfies Meta<typeof NoteItem>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Read mode: the actions sit in a menu. */
export const Default: Story = {};

/** Edit mode: edit and delete buttons. */
export const Buttons: Story = { args: { actions: "buttons" } };

/** Without the keys to change it, nothing is offered. */
export const ReadOnly: Story = {
	args: { onEdit: undefined, onDelete: undefined },
};

/** Line breaks kept, edited, and an author the API can't name. */
export const EditedByUnknown: Story = {
	args: {
		note: {
			...meta.args.note,
			body: "Needs improvement in time management.\nPair with Jane at peak hours.",
			author: { membershipId: "m-8", displayName: null },
			edited: true,
		},
	},
};
