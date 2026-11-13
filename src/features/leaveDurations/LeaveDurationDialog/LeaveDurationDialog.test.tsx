import { composeStories } from "@storybook/react-vite";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fn } from "storybook/test";
import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import type { LeaveDurationDialogProps } from "@/features/leaveDurations/LeaveDurationDialog";
import * as stories from "./LeaveDurationDialog.stories";

const problem = (status: number, errorCode: string): ApiProblemError =>
	new ApiProblemError({
		message: "Refused",
		status,
		errorCode,
		fieldErrors: [],
		reason: "http",
	});

const { CompanyAdminAdds, DepartmentAdminAdds, Edit, NightDuration } =
	composeStories(stories);

const chooseTime = async (
	user: ReturnType<typeof userEvent.setup>,
	field: string,
	time: string
): Promise<void> => {
	await user.click(screen.getByRole("button", { name: field }));
	await user.click(await screen.findByRole("option", { name: time }));
};

describe("LeaveDurationDialog", () => {
	it("adds a whole-company duration with its times, showing its length", async () => {
		const user = userEvent.setup();
		const onSave = fn<LeaveDurationDialogProps["onSave"]>(() =>
			Promise.resolve()
		);
		render(<CompanyAdminAdds onSave={onSave} />);

		await user.type(screen.getByRole("textbox", { name: /Name/ }), "Morning");
		await chooseTime(user, "Starts", "09:00");
		await chooseTime(user, "Ends", "13:00");
		expect(screen.getByText("4 h")).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Add duration" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith({
				name: "Morning",
				startTime: "09:00",
				endTime: "13:00",
				appliesToBranchIds: [],
				appliesToDepartmentIds: [],
			});
		});
	});

	it("offers a department admin only Chosen departments, with their department picked", () => {
		render(<DepartmentAdminAdds />);

		const group = screen.getByRole("radiogroup", { name: /Applies to/ });
		expect(within(group).getAllByRole("radio")).toHaveLength(1);
		expect(
			screen.getByRole("radio", { name: "Chosen departments" })
		).toBeChecked();
		expect(
			screen.getByRole("button", { name: "Chosen departments" })
		).toHaveTextContent("Kitchen");
	});

	it("says a night duration ends the next day", () => {
		render(<NightDuration />);

		expect(screen.getByText("4 h · Ends the next day")).toBeVisible();
	});

	it("refuses equal times before sending", async () => {
		const user = userEvent.setup();
		const onSave = fn<LeaveDurationDialogProps["onSave"]>(() =>
			Promise.resolve()
		);
		render(<CompanyAdminAdds onSave={onSave} />);

		await user.type(screen.getByRole("textbox", { name: /Name/ }), "Morning");
		await chooseTime(user, "Starts", "09:00");
		await chooseTime(user, "Ends", "09:00");
		await user.click(screen.getByRole("button", { name: "Add duration" }));

		expect(
			await screen.findByText("The end must differ from the start.")
		).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();
	});

	it("puts a name already used there on the name, and a reach not covered in the alert", async () => {
		const user = userEvent.setup();
		const onSave = fn<LeaveDurationDialogProps["onSave"]>()
			.mockRejectedValueOnce(problem(409, "LEAVE_DURATION_NAME_CONFLICT"))
			.mockRejectedValueOnce(problem(403, "LEAVE_DURATION_NOT_COVERED"));
		render(<Edit onSave={onSave} />);

		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(
			await screen.findByText(
				"A duration with this name already applies to one of these departments."
			)
		).toBeVisible();

		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(
			await screen.findByText("You can only choose departments you manage.")
		).toBeVisible();
	});
});
