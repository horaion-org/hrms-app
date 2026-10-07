import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { MemberNote } from "@/features/people/api";
import { NoteItem, type NoteItemProps } from "@/features/people/NoteItem";

const note: MemberNote = {
	noteId: "n-1",
	body: "Reliable and punctual.\nGreat with pastry.",
	author: { membershipId: "m-9", displayName: "Faris Ahmad" },
	createdAt: new Date(2026, 4, 16, 22, 36).toISOString(),
	updatedAt: new Date(2026, 4, 16, 22, 36).toISOString(),
	edited: false,
};
const WHEN = "16 May 2026, 22:36";

const show = (props: Partial<NoteItemProps> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<NoteItem actions="menu" note={note} {...props} />
		</I18nextProvider>
	);
};

describe("NoteItem", () => {
	it("shows the note as written, who added it and when", () => {
		show();

		expect(screen.getByText(/^Reliable/)).toHaveTextContent(
			"Reliable and punctual. Great with pastry.",
			{ normalizeWhitespace: true }
		);
		expect(screen.getByText(/^Reliable/).textContent).toContain("\n");
		expect(screen.getByText("Added by Faris Ahmad")).toBeVisible();
		expect(screen.getByText(WHEN)).toHaveAttribute("datetime", note.createdAt);
		expect(screen.queryByText("Edited")).toBeNull();
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("says when it was edited, and reads a missing author neutrally", () => {
		show({
			note: {
				...note,
				edited: true,
				author: { membershipId: "m-8", displayName: null },
			},
		});

		expect(screen.getByText("Added by an unknown person")).toBeVisible();
		expect(screen.getByText("Edited")).toBeVisible();
	});

	it("keeps only the allowed actions in a menu when read", async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();
		show({ onDelete });

		await user.click(
			screen.getByRole("button", {
				name: `More actions for the note from ${WHEN}`,
			})
		);
		expect(
			screen.getAllByRole("menuitem").map((item) => item.textContent)
		).toEqual(["Delete"]);
		await user.click(screen.getByRole("menuitem", { name: "Delete" }));
		expect(onDelete).toHaveBeenCalledOnce();
	});

	it("shows named edit and delete buttons when editing", async () => {
		const user = userEvent.setup();
		const onEdit = vi.fn();
		show({ actions: "buttons", onEdit, onDelete: vi.fn() });

		expect(screen.queryByRole("button", { name: /More actions/ })).toBeNull();
		expect(
			screen.getByRole("button", { name: `Delete the note from ${WHEN}` })
		).toBeVisible();
		await user.click(
			screen.getByRole("button", { name: `Edit the note from ${WHEN}` })
		);
		expect(onEdit).toHaveBeenCalledOnce();
	});
});
