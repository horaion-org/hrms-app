import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
import {
	SHIFT_FIXTURES,
	SHIFT_ROLE_OPTIONS,
} from "@/features/scheduling/shifts/fixtures";
import { ShiftDialog } from "@/features/scheduling/shifts/ShiftDialog";
import type { ShiftRoleOptions } from "@/features/scheduling/shifts/useShiftRoleOptions";
import { workspaceQuery } from "@/features/workspace/api";

const roles: ShiftRoleOptions = { status: "ready", items: SHIFT_ROLE_OPTIONS };

const problem = (status: number, errorCode: string): ApiProblemError =>
	new ApiProblemError({
		message: "Refused",
		status,
		errorCode,
		fieldErrors: [],
		reason: "http",
	});

const renderDialog = (
	props: Partial<Parameters<typeof ShiftDialog>[0]> = {}
): { onSave: ReturnType<typeof vi.fn>; onClose: ReturnType<typeof vi.fn> } => {
	const onSave = vi.fn().mockResolvedValue(undefined);
	const onClose = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<ShiftDialog
				groups={["Front Desk", "Kitchen"]}
				roles={roles}
				onClose={onClose}
				onSave={onSave}
				{...props}
			/>
		</I18nextProvider>
	);
	return { onSave, onClose };
};

/** A 07:00 to 19:00 shift, to edit. */
const longShift = (overrides: Partial<ScheduleShift> = {}): ScheduleShift => ({
	...(SHIFT_FIXTURES[0] as ScheduleShift),
	startTime: "07:00",
	endTime: "19:00",
	...overrides,
});

const trigger = (name: RegExp): HTMLElement =>
	screen.getByRole("button", { name });

/** Opens the group combobox and chooses or creates `group`. */
const pickGroup = async (
	user: ReturnType<typeof userEvent.setup>,
	group: string
): Promise<void> => {
	await user.click(trigger(/Shift type/));
	await user.type(screen.getByRole("combobox"), group);
	await user.click(
		(await screen.findAllByRole("option", { name: new RegExp(group) }))[0] ??
			screen.getByRole("option", { name: group })
	);
};

/** Opens a select and picks each option, closing it again. */
const pick = async (
	user: ReturnType<typeof userEvent.setup>,
	name: RegExp,
	...labels: Array<string>
): Promise<void> => {
	await user.click(trigger(name));
	await labels.reduce(
		(previous, label) =>
			previous.then(async () => {
				await user.click(await screen.findByRole("option", { name: label }));
			}),
		Promise.resolve()
	);
	if (screen.queryByRole("listbox")) await user.keyboard("{Escape}");
};

describe("ShiftDialog", () => {
	it("given_onlyAName_when_saved_then_asksForEveryOtherFieldAndSendsNothing", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog();
		const dialog = await screen.findByRole("dialog", {
			name: "Add custom shift",
		});

		await user.type(screen.getByLabelText("Shift name"), "Front Desk AM");
		await user.click(screen.getByRole("button", { name: "Save" }));

		const alerts = await screen.findAllByRole("alert");
		expect(alerts.map((alert) => alert.textContent)).toEqual([
			"Choose or create a type.",
			"Choose a colour.",
			"Choose a time.",
			"Choose a time.",
			"Choose at least one day.",
			"Choose at least one role.",
		]);
		expect(dialog).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();
	});

	it("given_everyField_when_saved_then_sendsTheShiftAndCloses", async () => {
		const user = userEvent.setup();
		const { onSave, onClose } = renderDialog();
		await screen.findByRole("dialog", { name: "Add custom shift" });

		await user.type(screen.getByLabelText("Shift name"), " Front Desk AM ");
		await pickGroup(user, "Kitchen");
		expect(trigger(/Shift type/)).toHaveTextContent("Kitchen");
		await user.click(screen.getByRole("radio", { name: "Orange" }));
		await pick(user, /Start time/, "09:00");
		await pick(user, /End time/, "15:00");
		await pick(user, /Days applied to/, "Monday", "Friday");
		await pick(user, /Roles applied to/, "Front Desk Lead");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith({
				name: "Front Desk AM",
				group: "Kitchen",
				colour: "#E9A55A",
				startTime: "09:00",
				endTime: "15:00",
				days: ["MON", "FRI"],
				jobTitleIds: ["front-desk-lead"],
				unpaidBreakMinutes: 0,
				carriesOvertime: false,
			});
		});
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("given_aBreakAndTheTick_when_saved_then_sendsBothAndShowsThePaidHours", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({
			editing: longShift({ unpaidBreakMinutes: 0 }),
		});
		await screen.findByRole("dialog", { name: "Edit shift" });
		expect(screen.getByText("12 paid hours")).toBeVisible();

		const field = screen.getByLabelText("Unpaid break (minutes)");
		await user.clear(field);
		await user.type(field, "60");
		await user.click(screen.getByLabelText("Carries built-in overtime"));
		expect(screen.getByText("11 paid hours")).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					unpaidBreakMinutes: 60,
					carriesOvertime: true,
				})
			);
		});
	});

	it("given_aShiftWithABreakAndTick_when_editing_then_startsFromThemAndResetReturnsToThem", async () => {
		const user = userEvent.setup();
		renderDialog({
			editing: longShift({ unpaidBreakMinutes: 60, carriesOvertime: true }),
		});
		await screen.findByRole("dialog", { name: "Edit shift" });
		const field = screen.getByLabelText("Unpaid break (minutes)");
		const tick = screen.getByLabelText("Carries built-in overtime");
		expect(field).toHaveValue(60);
		expect(tick).toBeChecked();

		await user.clear(field);
		await user.type(field, "30");
		await user.click(tick);
		await user.click(screen.getByRole("button", { name: "Reset" }));

		expect(field).toHaveValue(60);
		expect(tick).toBeChecked();
	});

	it("given_aBreakAsLongAsTheShift_when_saved_then_saysSoOnTheBreakAndSendsNothing", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ editing: longShift() });
		await screen.findByRole("dialog", { name: "Edit shift" });

		const field = screen.getByLabelText("Unpaid break (minutes)");
		await user.clear(field);
		await user.type(field, "720");
		expect(
			screen.getByText(
				"Enter a break only if people are free during it. A break spent on duty counts as work: leave this at 0."
			)
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(
			await screen.findByText("The break must be shorter than the shift.")
		).toBeVisible();
		expect(field).toHaveAttribute("aria-invalid", "true");
		expect(onSave).not.toHaveBeenCalled();
	});

	it("given_oneHourLeftAfterTheBreak_when_shown_then_saysOnePaidHour", async () => {
		renderDialog({
			editing: longShift({ endTime: "09:00", unpaidBreakMinutes: 60 }),
		});
		await screen.findByRole("dialog", { name: "Edit shift" });

		expect(screen.getByText("1 paid hour")).toBeVisible();
	});

	it("given_aBreakTooLongError_when_theShiftIsMadeLonger_then_theErrorClears", async () => {
		const user = userEvent.setup();
		renderDialog({ editing: longShift() });
		await screen.findByRole("dialog", { name: "Edit shift" });
		const field = screen.getByLabelText("Unpaid break (minutes)");
		await user.clear(field);
		await user.type(field, "720");
		await user.click(screen.getByRole("button", { name: "Save" }));
		await screen.findByText("The break must be shorter than the shift.");

		await pick(user, /End time/, "20:00");

		await waitFor(() => {
			expect(
				screen.queryByText("The break must be shorter than the shift.")
			).not.toBeInTheDocument();
		});
		expect(field).not.toHaveAttribute("aria-invalid", "true");
	});

	it("given_anEmptyBreak_when_saved_then_asksForMinutesAndSendsNothing", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ editing: longShift() });
		await screen.findByRole("dialog", { name: "Edit shift" });

		await user.clear(screen.getByLabelText("Unpaid break (minutes)"));
		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(
			await screen.findByText("Enter the break in whole minutes, or 0.")
		).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();
	});

	it("given_theApiRefusesTheBreak_when_saved_then_putsItOnTheBreakAndStaysOpen", async () => {
		const user = userEvent.setup();
		const { onClose } = renderDialog({
			editing: longShift(),
			onSave: vi.fn().mockRejectedValue(problem(400, "INVALID_SHIFT_BREAK")),
		});
		await screen.findByRole("dialog", { name: "Edit shift" });

		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(
			await screen.findByText("The break must be shorter than the shift.")
		).toBeVisible();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("given_aGroupNobodyHas_when_typed_then_itCanBeCreatedChosenAndSent", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ editing: SHIFT_FIXTURES[0] });
		await screen.findByRole("dialog", { name: "Edit shift" });
		expect(trigger(/Shift type/)).toHaveTextContent("Front Desk");

		await user.click(trigger(/Shift type/));
		await user.type(screen.getByRole("combobox"), "Night ");
		await user.click(screen.getByRole("option", { name: 'Create "Night"' }));
		expect(trigger(/Shift type/)).toHaveTextContent("Night");

		// The new group is now offered like any other.
		await user.click(trigger(/Shift type/));
		expect(screen.getByRole("option", { name: "Night" })).toBeVisible();
		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({ group: "Night" })
			);
		});
	});

	it("given_theDaysSelect_when_selectAllChosen_then_everyDayIsSent", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ editing: SHIFT_FIXTURES[1] });
		await screen.findByRole("dialog", { name: "Edit shift" });
		expect(trigger(/Days applied to/)).toHaveTextContent("4 selected");

		await pick(user, /Days applied to/, "Select all");
		expect(trigger(/Days applied to/)).toHaveTextContent("7 selected");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					days: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
				})
			);
		});
	});

	it("given_aShift_when_editing_then_startsFromItsDetailsAndResetReturnsToThem", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ editing: SHIFT_FIXTURES[0] });
		await screen.findByRole("dialog", { name: "Edit shift" });

		expect(screen.getByLabelText("Shift name")).toHaveValue("Front Desk AM");
		expect(trigger(/Shift type/)).toHaveTextContent("Front Desk");
		expect(screen.getByRole("radio", { name: "Orange" })).toBeChecked();
		expect(trigger(/Start time/)).toHaveTextContent("09:00");
		expect(trigger(/Days applied to/)).toHaveTextContent("5 selected");
		expect(trigger(/Roles applied to/)).toHaveTextContent("2 selected");

		await user.type(screen.getByLabelText("Shift name"), " Late");
		await user.click(screen.getByRole("radio", { name: "Olive" }));
		await user.click(screen.getByRole("button", { name: "Reset" }));
		expect(screen.getByLabelText("Shift name")).toHaveValue("Front Desk AM");
		expect(screen.getByRole("radio", { name: "Orange" })).toBeChecked();

		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "Front Desk AM",
					group: "Front Desk",
					colour: "#E9A55A",
					jobTitleIds: ["front-desk-staff", "front-desk-lead"],
				})
			);
		});
	});

	it("given_aNameConflict_when_saved_then_putsItOnTheNameAndStaysOpen", async () => {
		const user = userEvent.setup();
		const { onClose } = renderDialog({
			editing: SHIFT_FIXTURES[0],
			onSave: vi.fn().mockRejectedValue(problem(409, "SHIFT_NAME_CONFLICT")),
		});
		await screen.findByRole("dialog", { name: "Edit shift" });

		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			'A shift named "Front Desk AM" already exists in this department.'
		);
		expect(onClose).not.toHaveBeenCalled();
	});

	it("given_rolesHidden_when_rendered_then_saysSoAndOffersNone", async () => {
		renderDialog({ roles: { status: "hidden" } });
		await screen.findByRole("dialog", { name: "Add custom shift" });

		expect(
			screen.getByText(
				"You don’t have permission to see this department’s roles."
			)
		).toBeVisible();
		expect(trigger(/Roles applied to/)).toBeDisabled();
	});

	it("given_noActiveRoles_when_rendered_then_saysWhereToCreateOne", async () => {
		renderDialog({ roles: { status: "ready", items: [] } });
		await screen.findByRole("dialog", { name: "Add custom shift" });

		expect(
			screen.getByText(
				"This department has no active job titles yet. Create one under Organisation first."
			)
		).toBeVisible();
	});

	it("given_aOneLetterGroup_when_created_then_asksForALongerOne", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ editing: SHIFT_FIXTURES[0] });
		await screen.findByRole("dialog", { name: "Edit shift" });

		await user.click(trigger(/Shift type/));
		await user.type(screen.getByRole("combobox"), "N");
		await user.click(screen.getByRole("option", { name: 'Create "N"' }));
		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(await screen.findByText("Use 2 to 50 characters.")).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();
	});
});

describe("ShiftDialog with a Department field", () => {
	/** Adds a shift in Main branch, whose Front Office (d-1) and Kitchen (d-2) hold shift:create; roles load once one is chosen. */
	const ChoosingDialog = ({
		initial,
		onSave,
	}: {
		initial: string;
		onSave: () => Promise<unknown>;
	}): ReactElement => {
		const [departmentId, setDepartmentId] = useState(initial);
		return (
			<ShiftDialog
				groups={["Front Desk"]}
				roles={departmentId ? roles : { status: "pending" }}
				department={{
					kind: "choose",
					companyId: "c-1",
					keys: ["shift:create"],
					value: departmentId,
					onChange: setDepartmentId,
				}}
				onClose={vi.fn()}
				onSave={onSave}
			/>
		);
	};

	const renderInCompany = (dialog: ReactElement): void => {
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		client.setQueryData(
			workspaceQuery.queryKey,
			schedulingWorkspace(["shift:create"])
		);
		render(
			<I18nextProvider i18n={authTestI18n}>
				<QueryClientProvider client={client}>{dialog}</QueryClientProvider>
			</I18nextProvider>
		);
	};

	it("given_noDepartmentYet_when_named_then_keepsSaveDisabledAndAsksForTheDepartmentFirst", async () => {
		const user = userEvent.setup();
		renderInCompany(<ChoosingDialog initial="" onSave={vi.fn()} />);
		await screen.findByRole("dialog", { name: "Add custom shift" });

		await user.type(screen.getByLabelText("Shift name"), "Late");

		expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
		expect(screen.getByText("Choose a department first.")).toBeVisible();
		expect(trigger(/Roles applied to/)).toBeDisabled();

		await user.click(trigger(/^Department/));
		await user.click(screen.getByRole("option", { name: /Front Office/ }));
		expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
	});

	it("given_rolesChosen_when_theDepartmentChanges_then_clearsThem", async () => {
		const user = userEvent.setup();
		renderInCompany(<ChoosingDialog initial="d-1" onSave={vi.fn()} />);
		await screen.findByRole("dialog", { name: "Add custom shift" });

		await pick(user, /Roles applied to/, "Front Desk Lead");
		expect(trigger(/Roles applied to/)).toHaveTextContent("Front Desk Lead");
		await user.click(trigger(/^Department/));
		await user.click(screen.getByRole("option", { name: /Kitchen/ }));

		expect(trigger(/Roles applied to/)).not.toHaveTextContent(
			"Front Desk Lead"
		);
	});

	it("given_aFixedDepartmentAndANote_when_editing_then_showsTheDepartmentDisabledAndTheNote", async () => {
		renderInCompany(
			<ShiftDialog
				editing={SHIFT_FIXTURES[0]}
				groups={["Front Desk"]}
				impactNote="Saving changes this shift for Front Office and new schedules."
				roles={roles}
				department={{
					kind: "fixed",
					departmentId: "d-1",
					label: "Main branch › Front Office",
				}}
				onClose={vi.fn()}
				onSave={vi.fn()}
			/>
		);
		await screen.findByRole("dialog", { name: "Edit shift" });

		expect(trigger(/^Department/)).toBeDisabled();
		expect(trigger(/^Department/)).toHaveTextContent(
			"Main branch › Front Office"
		);
		expect(
			screen.getByText(
				"Saving changes this shift for Front Office and new schedules."
			)
		).toBeVisible();
	});
});
