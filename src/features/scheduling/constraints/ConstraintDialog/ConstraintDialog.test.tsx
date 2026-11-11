import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import { ConstraintDialog } from "@/features/scheduling/constraints/ConstraintDialog";
import {
	constraintSchema,
	type ConstraintDialogBody,
} from "@/features/scheduling/constraints/ConstraintDialog/schema";
import {
	BRANCH_POLICY_FIXTURE,
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS,
	CONSTRAINT_TYPE_OPTIONS,
} from "@/features/scheduling/constraints/fixtures";
import type { ConstraintOptionsState } from "@/features/scheduling/constraints/useConstraintOptions";
import { reachValueOf } from "@/features/scheduling/policy/policyReach";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
import { workspaceQuery } from "@/features/workspace/api";

const options: ConstraintOptionsState = {
	status: "ready",
	options: CONSTRAINT_OPTIONS,
};

const problem = (status: number, errorCode: string): ApiProblemError =>
	new ApiProblemError({
		message: "Refused",
		status,
		errorCode,
		fieldErrors: [],
		reason: "http",
	});

const renderDialog = (
	props: Partial<Parameters<typeof ConstraintDialog>[0]> = {}
): { onSave: ReturnType<typeof vi.fn>; onClose: ReturnType<typeof vi.fn> } => {
	const onSave = vi.fn().mockResolvedValue(undefined);
	const onClose = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<ConstraintDialog
				options={options}
				onClose={onClose}
				onSave={onSave}
				{...props}
			/>
		</I18nextProvider>
	);
	return { onSave, onClose };
};

const trigger = (name: RegExp): HTMLElement =>
	screen.getByRole("button", { name });

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

const nameField = (): HTMLElement =>
	screen.getByRole("textbox", { name: /^Name/ });

/** Replaces the name, suggested or not, with one typed in. */
const typeName = async (
	user: ReturnType<typeof userEvent.setup>,
	name: string
): Promise<void> => {
	await user.clear(nameField());
	await user.type(nameField(), name);
};

/** Names the constraint and chooses its type, as every new constraint starts. */
const start = async (
	user: ReturnType<typeof userEvent.setup>,
	type: string
): Promise<void> => {
	await screen.findByRole("dialog", { name: "Add constraint" });
	await typeName(user, "Morning cover");
	await pick(user, /^What it controls/, type);
};

/** Orchard with Kitchen and Bar, and Marina; the Applies to field chooses from these. */
const REACH = {
	choices: {
		branches: [
			{
				branchId: "b-2",
				name: "Marina",
				country: "SG",
				status: "ACTIVE" as const,
			},
			{
				branchId: "b-1",
				name: "Orchard",
				country: "SG",
				status: "ACTIVE" as const,
			},
		],
		departments: [
			{
				departmentId: "d-2",
				name: "Bar",
				branchId: "b-1",
				branchName: "Orchard",
				country: "SG",
				status: "ACTIVE" as const,
			},
			{
				departmentId: "d-1",
				name: "Kitchen",
				branchId: "b-1",
				branchName: "Orchard",
				country: "SG",
				status: "ACTIVE" as const,
			},
		],
	},
	initial: reachValueOf(),
};

const constraint = (
	constraintId: string
): (typeof CONSTRAINT_FIXTURES)[number] =>
	CONSTRAINT_FIXTURES.find((item) => item.constraintId === constraintId) ??
	CONSTRAINT_FIXTURES[0]!;

describe("ConstraintDialog for the Scheduling policy (ADR-0058)", () => {
	const companyRest = COMPANY_CONSTRAINT_FIXTURES[0]!;
	const companyWeekends = COMPANY_CONSTRAINT_FIXTURES[1]!;

	it("given_withLock_when_saved_then_sendsTheLockChosen", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ withLock: true });
		await start(user, "Rest between shifts");
		expect(trigger(/^Lock/)).toHaveTextContent("Locked");
		expect(
			screen.getByText(
				"Every department keeps it and can only make it stricter."
			)
		).toBeVisible();

		await pick(user, /^Lock/, "Default");
		await user.type(
			screen.getByRole("spinbutton", { name: /^Hours off/ }),
			"11"
		);
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "REST_BETWEEN_SHIFTS",
					lock: "DEFAULT",
					values: [{ field: "REST_HOURS", value: "11" }],
				})
			);
		});
	});

	it("given_aLockedCompanyConstraint_when_replacedLooser_then_refusedBeforeSending", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ replacing: companyRest });
		await screen.findByRole("dialog", { name: "Set for this department" });
		expect(
			screen.getByText(
				"Company rest is set by the company and locked. You can only make it stricter here."
			)
		).toBeVisible();
		expect(trigger(/^What it controls/)).toBeDisabled();

		await typeName(user, "Front rest");
		const hours = screen.getByRole("spinbutton", { name: /^Hours off/ });
		await user.clear(hours);
		await user.type(hours, "10");
		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(
			await screen.findByText(
				"These values wouldn’t be at least as strict as the company’s locked constraint in every part. Make them stricter, or keep the company’s."
			)
		).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();
	});

	it("given_anEarlierRefusal_when_replacedLooser_then_theLooserRefusalReplacesItAndTakesFocus", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn().mockRejectedValue(problem(500, "INTERNAL_ERROR"));
		renderDialog({ replacing: companyRest, onSave });
		await screen.findByRole("dialog", { name: "Set for this department" });
		await typeName(user, "Front rest");
		const hours = screen.getByRole("spinbutton", { name: /^Hours off/ });
		await user.clear(hours);
		await user.type(hours, "12");
		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"We couldn’t add the constraint. Try again."
		);

		await user.clear(hours);
		await user.type(hours, "10");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				"These values wouldn’t be at least as strict as the company’s locked constraint in every part."
			);
		});
		expect(screen.getByRole("alert")).toHaveFocus();
		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it("given_aLockedCompanyConstraint_when_replacedStricter_then_sendsItAsItsReplacement", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ replacing: companyRest });
		await screen.findByRole("dialog", { name: "Set for this department" });

		await typeName(user, "Front rest");
		const hours = screen.getByRole("spinbutton", { name: /^Hours off/ });
		await user.clear(hours);
		await user.type(hours, "12");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "REST_BETWEEN_SHIFTS",
					overridesConstraintId: "company-rest",
					values: [{ field: "REST_HOURS", value: "12" }],
				})
			);
		});
	});

	it("given_aDefault_when_replacedLooser_then_sent", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ replacing: companyWeekends });
		await screen.findByRole("dialog", { name: "Set for this department" });

		await typeName(user, "No weekends");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({ overridesConstraintId: "company-weekends" })
			);
		});
	});

	it("given_aSavedCompanyRule_when_edited_then_itsTypeIsFixedAndSentUnchanged", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ editing: companyRest, withLock: true });
		await screen.findByRole("dialog", { name: "Edit constraint" });

		expect(trigger(/^What it controls/)).toBeDisabled();
		expect(
			screen.getByText(
				"A company constraint’s type can’t be changed. Add a new constraint instead."
			)
		).toBeVisible();

		await user.click(screen.getByRole("button", { name: "Save" }));
		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({ type: companyRest.type })
			);
		});
	});

	it("given_aNewCompanyRule_when_added_then_itsTypeCanBeChosen", async () => {
		renderDialog({ withLock: true });
		await screen.findByRole("dialog", { name: "Add constraint" });

		expect(trigger(/^What it controls/)).toBeEnabled();
	});

	it("given_theApiRefusesAsNotStricter_when_saved_then_explainsIt", async () => {
		const user = userEvent.setup();
		const onSave = vi
			.fn()
			.mockRejectedValue(problem(409, "CONSTRAINT_OVERRIDE_NOT_STRICTER"));
		renderDialog({ replacing: companyWeekends, onSave });
		await screen.findByRole("dialog", { name: "Set for this department" });

		await typeName(user, "No weekends");
		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(
			await screen.findByText(
				"These values wouldn’t be at least as strict as the company’s locked constraint in every part. Make them stricter, or keep the company’s."
			)
		).toBeVisible();
	});
});

describe("ConstraintDialog for a work-policy constraint's reach (ADR-0072)", () => {
	it("given_chosenDepartments_when_saved_then_sendsThemAndNoBranch", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ withLock: true, reach: REACH });
		await start(user, "Working hours: Rest between shifts");

		await user.click(screen.getByRole("radio", { name: "Chosen departments" }));
		await pick(user, /^Chosen departments/, "Kitchen", "Bar");
		await user.type(screen.getByRole("spinbutton", { name: /Rest/ }), "11");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalled();
		});
		const [body] = onSave.mock.lastCall as [ConstraintDialogBody];
		expect(body.appliesToBranchIds).toEqual([]);
		expect([...(body.appliesToDepartmentIds ?? [])].sort()).toEqual([
			"d-1",
			"d-2",
		]);
	});

	it("given_chosenBranchesWithNoneChosen_when_saved_then_asksForOneWithoutSending", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ withLock: true, reach: REACH });
		await start(user, "Working hours: Rest between shifts");

		await user.click(screen.getByRole("radio", { name: "Chosen branches" }));
		await user.type(screen.getByRole("spinbutton", { name: /Rest/ }), "11");
		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(
			await screen.findByText("Choose at least one branch.")
		).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();
	});

	it("given_aConstraintForOneBranch_when_edited_then_opensOnThatBranch", async () => {
		renderDialog({
			editing: BRANCH_POLICY_FIXTURE,
			withLock: true,
			reach: { ...REACH, initial: reachValueOf(BRANCH_POLICY_FIXTURE) },
		});
		await screen.findByRole("dialog", { name: "Edit constraint" });

		expect(
			screen.getByRole("radio", { name: "Chosen branches" })
		).toBeChecked();
		expect(trigger(/^Chosen branches/)).toHaveTextContent("Orchard");
	});

	it("given_aDepartmentsDialog_when_shown_then_offersNoReach", async () => {
		renderDialog();
		await screen.findByRole("dialog", { name: "Add constraint" });

		expect(screen.queryByRole("radiogroup", { name: /Applies to/ })).toBeNull();
	});
});

describe("ConstraintDialog", () => {
	it("given_noTypeYet_when_rendered_then_offersEveryTypeUnderItsCategory", async () => {
		const user = userEvent.setup();
		renderDialog();
		await screen.findByRole("dialog", { name: "Add constraint" });

		expect(screen.queryByRole("spinbutton")).toBeNull();
		expect(screen.queryByRole("button", { name: /^Status/ })).toBeNull();
		await user.click(trigger(/^What it controls/));

		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual([
			"People on a shift",
			"People on a shift, with stand-ins",
			"Someone on duty for the whole shift",
			"Days off in a run of days",
			"Days to avoid giving off",
			"Rest between shifts",
		]);
		for (const [category, count] of [
			["People on shifts", 2],
			["On duty throughout", 1],
			["Days off", 2],
			["Rest and hours", 1],
		] as const)
			expect(
				within(screen.getByRole("group", { name: category })).getAllByRole(
					"option"
				)
			).toHaveLength(count);
	});

	it("given_aTypeChosen_when_rendered_then_itsHintIsAWorkedExample", async () => {
		const user = userEvent.setup();
		renderDialog();
		await screen.findByRole("dialog", { name: "Add constraint" });
		expect(screen.getByText("Choose one to see an example.")).toBeVisible();

		await pick(user, /^What it controls/, "Rest between shifts");

		expect(
			screen.getByText(
				"For example: Everyone gets at least 11 hours off between shifts."
			)
		).toBeVisible();
	});

	it("given_aType_when_chosen_then_rendersOneRowPerFieldOfItsSpecByKind", async () => {
		const user = userEvent.setup();
		renderDialog();
		await start(user, "People on a shift, with stand-ins");

		expect(screen.getByRole("radiogroup", { name: /^How firm/ })).toBeVisible();
		expect(screen.queryByRole("button", { name: /^Status/ })).toBeNull();
		expect(screen.getByRole("spinbutton", { name: /^People/ })).toHaveAttribute(
			"max",
			"999"
		);
		expect(
			screen.getByRole("spinbutton", { name: /^Stand-ins for 1 person/ })
		).toHaveAttribute("min", "1");
		expect(
			screen.getByText(
				"For example 2: two stand-ins count as one person. 1 to 10."
			)
		).toBeVisible();
		expect(trigger(/^Job titles that count/)).toBeVisible();
		expect(trigger(/^Job titles that can stand in/)).toBeVisible();
		expect(trigger(/^Shifts/)).toBeVisible();
		expect(
			screen.queryByRole("button", { name: /^At least, at most or exactly/ })
		).toBeNull();
	});

	it("given_aStaffingType_when_chosen_then_thePreviewComesFirstAndTheFieldsFollowInReadingOrder", async () => {
		const user = userEvent.setup();
		renderDialog();
		await start(user, "People on a shift");

		const labels = [
			screen.getByRole("region", { name: "How it reads" }),
			trigger(/^Shifts/),
			trigger(/^At least, at most or exactly/),
			screen.getByRole("spinbutton", { name: /^People/ }),
			trigger(/^Job titles that count/),
		];
		for (const [earlier, later] of labels
			.slice(0, -1)
			.map((element, index) => [element, labels[index + 1]!]))
			expect(
				earlier!.compareDocumentPosition(later!) &
					Node.DOCUMENT_POSITION_FOLLOWING
			).toBeTruthy();
		// The comparison and the number it compares share one row.
		const comparisonRow = trigger(/^At least, at most or exactly/).closest(
			".sm\\:flex-row"
		);
		expect(comparisonRow).toContainElement(
			screen.getByRole("spinbutton", { name: /^People/ })
		);
	});

	it("given_onlyANameAndType_when_saved_then_asksForEachFieldAsItsSpecSaysAndSendsNothing", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog();
		await start(user, "People on a shift");

		await user.click(screen.getByRole("button", { name: "Save" }));

		const alerts = await screen.findAllByRole("alert");
		// In reading order: shifts, comparison, people, job titles; how firm starts as Must.
		expect(alerts.map((alert) => alert.textContent)).toEqual([
			"Choose at least one.",
			"Choose one.",
			"Enter a whole number from 0 to 999.",
			"Choose at least one.",
		]);
		expect(onSave).not.toHaveBeenCalled();
	});

	it("given_everyField_when_saved_then_sendsOneValueRowPerValueAndReadsItBack", async () => {
		const user = userEvent.setup();
		const { onSave, onClose } = renderDialog();
		await start(user, "People on a shift");

		expect(screen.getByRole("radio", { name: "Must" })).toBeChecked();
		await pick(user, /^At least, at most or exactly/, "At least");
		await user.type(screen.getByRole("spinbutton", { name: /^People/ }), "2");
		await pick(
			user,
			/^Job titles that count/,
			"Front Desk Staff",
			"Front Desk Lead"
		);
		await pick(user, /^Shifts/, "Front Desk AM");
		expect(
			screen.getByRole("region", { name: "How it reads" })
		).toHaveTextContent(
			"Must Front Desk AM needs at least 2 people as Front Desk Lead or Front Desk Staff.Front Desk AM"
		);
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith({
				name: "Morning cover",
				type: "SHIFT_STAFFING",
				requirement: "MUST",
				status: "ACTIVE",
				values: [
					{ field: "COMPARISON", value: "AT_LEAST" },
					{ field: "HEADCOUNT", value: "2" },
					{ field: "JOB_TITLE", value: "front-desk-lead" },
					{ field: "JOB_TITLE", value: "front-desk-staff" },
					{ field: "SHIFT", value: "front-desk-am" },
				],
			});
		});
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("given_IfPossibleChosen_when_previewed_then_theTagFollows", async () => {
		const user = userEvent.setup();
		renderDialog();
		await start(user, "Days off in a run of days");
		const preview = screen.getByRole("region", { name: "How it reads" });
		expect(within(preview).getByText("Must")).toBeVisible();

		await user.click(screen.getByRole("radio", { name: "If possible" }));

		expect(within(preview).getByText("If possible")).toHaveAttribute(
			"title",
			"Kept when it can be. The schedule shows where it wasn't."
		);
	});

	it("given_aNewConstraint_when_typeAndShiftChosen_then_theNameFillsItselfInUntilTyped", async () => {
		const user = userEvent.setup();
		renderDialog();
		await screen.findByRole("dialog", { name: "Add constraint" });

		await pick(user, /^What it controls/, "People on a shift");
		expect(nameField()).toHaveValue("People on a shift");
		await pick(user, /^Shifts/, "Front Desk AM");
		expect(nameField()).toHaveValue("Front Desk AM staffing");

		await typeName(user, "Morning cover");
		await pick(user, /^Shifts/, "Breakfast Prep");
		expect(nameField()).toHaveValue("Morning cover");
	});

	it("given_aShiftThatListsNoneOfTheJobTitles_when_chosen_then_warnsAndStillSaves", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog();
		await start(user, "People on a shift");
		await pick(user, /^Shifts/, "Front Desk AM");
		await pick(user, /^At least, at most or exactly/, "At least");
		await user.type(screen.getByRole("spinbutton", { name: /^People/ }), "2");

		await pick(user, /^Job titles that count/, "Front Desk Lead");
		expect(screen.queryByText(/doesn't list/)).toBeNull();

		// Swaps Front Desk Lead (ticked again, so off) for Cashier, which Front Desk AM does not list.
		await pick(user, /^Job titles that count/, "Front Desk Lead", "Cashier");
		expect(
			screen.getByText(
				"Front Desk AM doesn't list Cashier, so no one can be counted there. Add them to the shift or choose other job titles."
			)
		).toBeVisible();

		await user.click(screen.getByRole("button", { name: "Save" }));
		await waitFor(() => {
			expect(onSave).toHaveBeenCalledOnce();
		});
	});

	it("given_aSavedConstraint_when_editing_then_keepsItsName", async () => {
		renderDialog({ editing: constraint("closing-supervisor") });
		await screen.findByRole("dialog", { name: "Edit constraint" });

		expect(nameField()).toHaveValue("Closing supervisor");
	});

	it("given_aShouldConstraint_when_editing_then_startsOnIfPossible", async () => {
		renderDialog({ editing: constraint("closing-supervisor") });
		await screen.findByRole("dialog", { name: "Edit constraint" });

		expect(screen.getByRole("radio", { name: "If possible" })).toBeChecked();
		expect(trigger(/^Status/)).toHaveTextContent("Active");
	});

	it("given_aTypeWithoutARequirement_when_saved_then_offersNoneAndSendsNone", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog();
		await start(user, "Days to avoid giving off");

		expect(screen.queryByRole("radiogroup")).toBeNull();
		expect(
			screen.getByText("Always if possible for this kind of constraint.")
		).toBeVisible();
		await pick(user, /^Days of the week/, "Saturday", "Friday");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "AVOID_DAYS_OFF_ON",
					requirement: null,
					// Monday first, whatever order they were chosen in.
					values: [
						{ field: "WEEKDAY", value: "FRI" },
						{ field: "WEEKDAY", value: "SAT" },
					],
				})
			);
		});
	});

	it("given_aNumberOutsideItsRange_when_saved_then_saysTheRangeFromTheSpec", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog();
		await start(user, "Rest between shifts");

		await user.type(
			screen.getByRole("spinbutton", { name: /^Hours off/ }),
			"25"
		);
		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(
			await screen.findByText("Enter a whole number from 1 to 24.")
		).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();
	});

	it("given_aConstraint_when_editing_then_startsFromItsValuesChecksAcrossFieldsAndResetReturnsToThem", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ editing: constraint("two-days-off") });
		await screen.findByRole("dialog", { name: "Edit constraint" });
		const daysOff = screen.getByRole("spinbutton", { name: /^Days off/ });

		expect(nameField()).toHaveValue("Two days off");
		expect(trigger(/^What it controls/)).toHaveTextContent(
			"Days off in a run of days"
		);
		expect(screen.getByRole("radio", { name: "Must" })).toBeChecked();
		expect(trigger(/^At least, at most or exactly/)).toHaveTextContent(
			"At least"
		);
		expect(daysOff).toHaveValue(2);

		await user.clear(daysOff);
		await user.type(daysOff, "8");
		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(
			await screen.findByText(
				"Days off can’t be more than the days in the period."
			)
		).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "Reset" }));
		expect(daysOff).toHaveValue(2);
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith({
				name: "Two days off",
				type: "DAYS_OFF_PER_PERIOD",
				requirement: "MUST",
				status: "ACTIVE",
				values: [
					{ field: "COMPARISON", value: "AT_LEAST" },
					{ field: "DAYS_OFF", value: "2" },
					{ field: "PERIOD_DAYS", value: "7" },
				],
			});
		});
	});

	it("given_aDaysOffConstraint_when_itsPeriodIsLongerThanAWeek_then_refusedWithTheDeclaredRange", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ editing: constraint("two-days-off") });
		await screen.findByRole("dialog", { name: "Edit constraint" });
		const periodDays = screen.getByRole("spinbutton", {
			name: /^Days in a row/,
		});

		expect(
			screen.getByText("For example 7: any 7 days in a row. 1 to 7.")
		).toBeVisible();

		await user.clear(periodDays);
		await user.type(periodDays, "8");
		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(
			await screen.findByText("Enter a whole number from 1 to 7.")
		).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();
	});

	it.each([
		[
			"CONSTRAINT_TYPE_ALREADY_USED",
			"This department already has a constraint of this type. Edit that one instead.",
		],
		[
			"CONSTRAINT_NAME_CONFLICT",
			'A constraint named "Rest between shifts" already exists in this department. Choose a different name.',
		],
	])(
		"given_%s_when_saved_then_putsItOnItsFieldAndStaysOpen",
		async (code, copy) => {
			const user = userEvent.setup();
			const { onClose } = renderDialog({
				editing: constraint("rest-between-shifts"),
				onSave: vi.fn().mockRejectedValue(problem(409, code)),
			});
			await screen.findByRole("dialog", { name: "Edit constraint" });

			await user.click(screen.getByRole("button", { name: "Save" }));

			expect(await screen.findByRole("alert")).toHaveTextContent(copy);
			expect(onClose).not.toHaveBeenCalled();
		}
	);

	it("given_optionsHidden_when_rendered_then_saysSoAndOffersNoType", async () => {
		renderDialog({ options: { status: "hidden" } });
		await screen.findByRole("dialog", { name: "Add constraint" });

		expect(
			screen.getByText(
				"You don’t have permission to see this department’s constraint types."
			)
		).toBeVisible();
		expect(trigger(/^What it controls/)).toBeDisabled();
		expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
	});
});

describe("ConstraintDialog with a Department field", () => {
	/** Adds a constraint in Main branch, whose Front Office (d-1) and Kitchen (d-2) hold constraint:create; options load once one is chosen. */
	const ChoosingDialog = ({ initial }: { initial: string }): ReactElement => {
		const [departmentId, setDepartmentId] = useState(initial);
		return (
			<ConstraintDialog
				options={departmentId ? options : { status: "pending" }}
				department={{
					kind: "choose",
					companyId: "c-1",
					keys: ["constraint:create"],
					value: departmentId,
					onChange: setDepartmentId,
				}}
				onClose={vi.fn()}
				onSave={vi.fn()}
			/>
		);
	};

	const renderInCompany = (dialog: ReactElement): void => {
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		client.setQueryData(
			workspaceQuery.queryKey,
			schedulingWorkspace(["constraint:create"])
		);
		render(
			<I18nextProvider i18n={authTestI18n}>
				<QueryClientProvider client={client}>{dialog}</QueryClientProvider>
			</I18nextProvider>
		);
	};

	it("given_noDepartmentYet_when_named_then_keepsSaveDisabledAndAsksForTheDepartmentFirst", async () => {
		const user = userEvent.setup();
		renderInCompany(<ChoosingDialog initial="" />);
		await screen.findByRole("dialog", { name: "Add constraint" });

		await typeName(user, "Rest");

		expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
		expect(screen.getByText("Choose a department first.")).toBeVisible();
		expect(trigger(/^What it controls/)).toBeDisabled();

		await user.click(trigger(/^Department/));
		await user.click(screen.getByRole("option", { name: /Front Office/ }));
		expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
	});

	it("given_valuesFilledIn_when_theDepartmentChanges_then_clearsThemAndKeepsTheRest", async () => {
		const user = userEvent.setup();
		renderInCompany(<ChoosingDialog initial="d-1" />);
		await start(user, "Rest between shifts");
		await user.type(
			screen.getByRole("spinbutton", { name: /^Hours off/ }),
			"11"
		);

		await user.click(trigger(/^Department/));
		await user.click(screen.getByRole("option", { name: /Kitchen/ }));

		expect(screen.getByRole("spinbutton", { name: /^Hours off/ })).toHaveValue(
			null
		);
		expect(nameField()).toHaveValue("Morning cover");
		expect(trigger(/^What it controls/)).toHaveTextContent(
			"Rest between shifts"
		);
	});

	it("given_aFixedDepartmentAndANote_when_editing_then_showsTheDepartmentDisabledAndTheNote", async () => {
		renderInCompany(
			<ConstraintDialog
				editing={CONSTRAINT_FIXTURES[2]}
				impactNote="Saving changes this constraint for Front Office and new schedules."
				options={options}
				department={{
					kind: "fixed",
					departmentId: "d-1",
					label: "Main branch › Front Office",
				}}
				onClose={vi.fn()}
				onSave={vi.fn()}
			/>
		);
		await screen.findByRole("dialog", { name: "Edit constraint" });

		expect(trigger(/^Department/)).toBeDisabled();
		expect(trigger(/^Department/)).toHaveTextContent(
			"Main branch › Front Office"
		);
		expect(
			screen.getByText(
				"Saving changes this constraint for Front Office and new schedules."
			)
		).toBeVisible();
	});
});

describe("constraintSchema", () => {
	const t = authTestI18n.t;
	const standIns = CONSTRAINT_TYPE_OPTIONS[1]!;
	const valid = {
		name: "Lunch cover",
		type: "SHIFT_STAFFING_WITH_STAND_INS",
		requirement: "SHOULD",
		status: "ACTIVE" as const,
		values: {
			HEADCOUNT: ["2"],
			STAND_INS_PER_PERSON: ["2"],
			JOB_TITLE: ["supervisor"],
			STAND_IN_JOB_TITLE: ["service-staff"],
			SHIFT: ["lunch-rush"],
			// Left from another type; never sent.
			COMPARISON: ["AT_LEAST"],
		},
	};

	it("given_valuesOfTheType_when_parsed_then_yieldsTheBodyWithItsFieldsOnly", () => {
		const parsed = constraintSchema(standIns, t).safeParse(valid);

		expect(parsed.data?.values.map((value) => value.field)).toEqual([
			"HEADCOUNT",
			"STAND_INS_PER_PERSON",
			"JOB_TITLE",
			"STAND_IN_JOB_TITLE",
			"SHIFT",
		]);
	});

	it("given_aStandInAlsoCounted_when_parsed_then_refusesItOnTheStandIns", () => {
		const parsed = constraintSchema(standIns, t).safeParse({
			...valid,
			values: { ...valid.values, STAND_IN_JOB_TITLE: ["supervisor"] },
		});

		expect(parsed.error?.issues).toEqual([
			expect.objectContaining({
				path: ["values", "STAND_IN_JOB_TITLE"],
				message:
					"A stand-in job title can’t also be one of the counted job titles.",
			}),
		]);
	});

	it("given_moreValuesThanTheSpecAllows_when_parsed_then_saysTheMost", () => {
		const parsed = constraintSchema(standIns, t).safeParse({
			...valid,
			values: {
				...valid.values,
				SHIFT: Array.from({ length: 21 }, (_, index) => `shift-${index}`),
			},
		});

		expect(parsed.error?.issues[0]?.message).toBe("Choose at most 20.");
	});
});
