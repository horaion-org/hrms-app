import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { MemberNote } from "@/features/people/api";
import { NoteDialog } from "@/features/people/NoteDialog";

const NOTES = "/api/v1/companies/c-1/member-profiles/m-1/notes";
const note: MemberNote = {
	noteId: "n-1",
	body: "Reliable.",
	author: { membershipId: "m-9", displayName: "Faris Ahmad" },
	createdAt: "2026-05-16T14:36:00Z",
	updatedAt: "2026-05-16T14:36:00Z",
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

const show = (editing?: MemberNote): (() => void) => {
	const onClose = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={new QueryClient()}>
				<NoteDialog
					companyId="c-1"
					editing={editing}
					membershipId="m-1"
					name="Kent Chua"
					onClose={onClose}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
	return onClose;
};

describe("NoteDialog", () => {
	it("adds a trimmed note, counting its characters, and closes", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			[`POST ${NOTES}`]: { status: 201, body: envelope(note) },
		});
		const onClose = show();

		const field = screen.getByRole("textbox", { name: "Note" });
		expect(field).toHaveAttribute("maxlength", "1000");
		expect(field).toHaveAccessibleDescription(
			"Up to 1,000 characters. Line breaks are kept."
		);
		expect(screen.getByRole("button", { name: "Add note" })).toBeDisabled();
		await user.type(field, " Reliable. ");
		expect(screen.getByText("11/1000")).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Add note" }));

		await waitFor(() => {
			expect(onClose).toHaveBeenCalledOnce();
		});
		expect(calls.map((call) => call.body)).toEqual([{ body: "Reliable." }]);
	});

	it("rewrites a note, starting from it, and explains a refusal", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			[`PUT ${NOTES}/n-1`]: problemReply(403, "AUTHORIZATION_DENIED"),
		});
		const onClose = show(note);

		expect(screen.getByRole("dialog", { name: "Edit note" })).toBeVisible();
		const field = screen.getByRole("textbox", { name: "Note" });
		expect(field).toHaveValue("Reliable.");
		await user.type(field, " Always.");
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		expect(
			await screen.findByText(
				"You no longer have permission to edit this note."
			)
		).toHaveAttribute("role", "alert");
		expect(calls[0]?.body).toEqual({ body: "Reliable. Always." });
		expect(onClose).not.toHaveBeenCalled();
	});
});
