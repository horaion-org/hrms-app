import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	RosterShiftDialog,
	type RosterShiftAction,
} from "@/features/scheduling/ShiftDetailsPanel/RosterShiftDialog";
import type { RosterShift } from "@/features/scheduling/schedules";

const shift: RosterShift = {
	shiftId: "shift-1",
	date: "2026-10-12",
	start: "09:00",
	end: "17:00",
	breakMinutes: 60,
	role: "Front desk",
	location: "Main branch",
	kind: "full",
};
const renderDialog = (
	action: RosterShiftAction
): { onApply: ReturnType<typeof vi.fn>; onClose: ReturnType<typeof vi.fn> } => {
	const onApply = vi.fn();
	const onClose = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<RosterShiftDialog
				action={action}
				period={{ start: "2026-10-12", end: "2026-10-18" }}
				shift={shift}
				staffId="one"
				assignment={{
					role: "Receptionist",
					location: "East branch",
					branchId: "b-2",
					departmentId: "d-2",
					jobTitleId: "j-2",
				}}
				staff={[
					{ staffId: "one", name: "Aisha", jobTitle: "Staff", shifts: [shift] },
					{ staffId: "two", name: "John", jobTitle: "Staff", shifts: [] },
				]}
				onApply={onApply}
				onClose={onClose}
			/>
		</I18nextProvider>
	);
	return { onApply, onClose };
};

describe("roster action previews", () => {
	it("edits shift details and submits the changed preview", async () => {
		const user = userEvent.setup();
		const { onApply } = renderDialog("edit");
		await user.click(screen.getByRole("button", { name: "Save changes" }));
		await waitFor(() => {
			expect(onApply).toHaveBeenCalledWith(
				"one",
				expect.objectContaining({ location: "East branch" })
			);
		});
	});

	it("reassigns to the chosen person", async () => {
		const user = userEvent.setup();
		const { onApply } = renderDialog("reassign");
		await user.click(screen.getByRole("button", { name: "Assign to" }));
		await user.click(screen.getByRole("option", { name: "John" }));
		await user.click(screen.getByRole("button", { name: "Reassign" }));
		await waitFor(() => {
			expect(onApply).toHaveBeenCalledWith(
				"two",
				expect.objectContaining({ shiftId: "shift-1" })
			);
		});
	});

	it("prevents duplicating over an occupied day and allows a free day", async () => {
		const user = userEvent.setup();
		const { onApply } = renderDialog("duplicate");
		await user.click(screen.getByRole("button", { name: "Date" }));
		await user.click(screen.getByRole("option", { name: /Mon.*Oct 12/ }));
		await user.click(screen.getByRole("button", { name: "Duplicate" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"already has a shift"
		);
		expect(onApply).not.toHaveBeenCalled();
		await user.click(screen.getByRole("button", { name: "Date" }));
		await user.click(screen.getByRole("option", { name: /Tue.*Oct 13/ }));
		await user.click(screen.getByRole("button", { name: "Duplicate" }));
		await waitFor(() => {
			expect(onApply).toHaveBeenCalledWith(
				"one",
				expect.objectContaining({ date: "2026-10-13" })
			);
		});
	});

	it("cancels without changing the roster", async () => {
		const user = userEvent.setup();
		const { onApply, onClose } = renderDialog("edit");
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onClose).toHaveBeenCalledOnce();
		expect(onApply).not.toHaveBeenCalled();
	});
});
