import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import { ConstraintDialog } from "@/features/scheduling/constraints/ConstraintDialog";
import { typeGroupsOf } from "@/features/scheduling/constraints/ConstraintDialog/typeGroups";
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
	MOST_HOURS_A_DAY_FIXTURE,
	MOST_OVERTIME_A_MONTH_FIXTURE,
	WEEKLY_RULE_FIXTURE,
} from "@/features/scheduling/constraints/fixtures";
import type { ConstraintOptionsState } from "@/features/scheduling/constraints/useConstraintOptions";
import { reachValueOf } from "@/features/workspace/unitReach";
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

/** Chooses what the constraint decides on the chooser, then goes on to the form. */
const chooseType = async (
	user: ReturnType<typeof userEvent.setup>,
	label: string
): Promise<void> => {
	await user.click(await screen.findByRole("radio", { name: label }));
	await user.click(screen.getByRole("button", { name: "Continue" }));
};

/** The button that sends the form: Add constraint for a new one, Save for an edit. */
const submitButton = (): HTMLElement =>
	screen.getByRole("button", { name: /^(Save|Add constraint)$/ });

/** The link back to the chooser, offered while the kind may change. */
const changeTypeLink = (): HTMLElement | null =>
	screen.queryByRole("button", { name: /^Change what it decides/ });

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
	await chooseType(user, type);
	await typeName(user, "Morning cover");
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
		await user.click(submitButton());

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
		expect(changeTypeLink()).toBeNull();

		await typeName(user, "Front rest");
		const hours = screen.getByRole("spinbutton", { name: /^Hours off/ });
		await user.clear(hours);
		await user.type(hours, "10");
		await user.click(submitButton());

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
		await user.click(submitButton());
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"We couldn’t add the constraint. Try again."
		);

		await user.clear(hours);
		await user.type(hours, "10");
		await user.click(submitButton());

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
		await user.click(submitButton());

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
		await user.click(submitButton());

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

		expect(changeTypeLink()).toBeNull();
		expect(
			screen.getByText(
				"A company constraint’s type can’t be changed. Add a new constraint instead."
			)
		).toBeVisible();

		await user.click(submitButton());
		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({ type: companyRest.type })
			);
		});
	});

	it("given_mostHoursADay_when_edited_then_showsMomsLimitAndKeepsAFigureAboveIt", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({
			withLock: true,
			editing: MOST_HOURS_A_DAY_FIXTURE,
			reach: { choices: REACH.choices, initial: reachValueOf() },
		});
		await screen.findByRole("dialog", { name: "Edit constraint" });

		expect(screen.getByText("Most hours a day")).toBeVisible();
		expect(changeTypeLink()).toBeNull();
		expect(screen.queryByRole("button", { name: /^Lock/ })).toBeNull();
		expect(screen.queryByRole("button", { name: /^Status/ })).toBeNull();
		expect(screen.getByText("1 to 24. MOM’s limit is 12.")).toBeVisible();
		const hours = screen.getByRole("spinbutton", { name: /^Hours a day/ });
		expect(hours).toHaveAttribute("max", "24");

		await user.clear(hours);
		await user.type(hours, "13");
		await user.click(submitButton());

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "MAX_WORK_HOURS_PER_DAY",
					lock: "LOCKED",
					values: [{ field: "WORK_HOURS_A_DAY", value: "13" }],
				})
			);
		});
	});

	it("given_mostOvertimeAMonth_when_edited_then_explainsRestDayWorkAndKeepsNoOvertime", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({
			withLock: true,
			editing: MOST_OVERTIME_A_MONTH_FIXTURE,
			reach: { choices: REACH.choices, initial: reachValueOf() },
		});
		await screen.findByRole("dialog", { name: "Edit constraint" });

		expect(
			screen.getByText(
				"0 to 744. MOM’s limit is 72; rest-day work is outside it, except hours past the normal day."
			)
		).toBeVisible();
		const hours = screen.getByRole("spinbutton", {
			name: /^Overtime hours a month/,
		});

		await user.clear(hours);
		await user.type(hours, "0");
		await user.click(submitButton());

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "MAX_OVERTIME_HOURS_PER_MONTH",
					values: [{ field: "OVERTIME_HOURS_A_MONTH", value: "0" }],
				})
			);
		});
	});

	it("given_theLockedMostHoursADay_when_aDepartmentAsksForMore_then_refusedBeforeSendingAndFewerIsSent", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ replacing: MOST_HOURS_A_DAY_FIXTURE });
		await screen.findByRole("dialog", { name: "Set for this department" });
		await typeName(user, "Kitchen hours");
		const hours = screen.getByRole("spinbutton", { name: /^Hours a day/ });

		await user.clear(hours);
		await user.type(hours, "13");
		await user.click(submitButton());
		expect(
			await screen.findByText(
				"These values wouldn’t be at least as strict as the company’s locked constraint in every part. Make them stricter, or keep the company’s."
			)
		).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();

		await user.clear(hours);
		await user.type(hours, "10");
		await user.click(submitButton());

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "MAX_WORK_HOURS_PER_DAY",
					overridesConstraintId: "most-hours-a-day",
					values: [{ field: "WORK_HOURS_A_DAY", value: "10" }],
				})
			);
		});
	});

	it("given_aCeilingSavedWithoutARequirement_when_theCompanyEditsIt_then_opensAsMustAndSavesIfPossible", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({
			withLock: true,
			editing: MOST_HOURS_A_DAY_FIXTURE,
			reach: { choices: REACH.choices, initial: reachValueOf() },
		});
		await screen.findByRole("dialog", { name: "Edit constraint" });

		expect(screen.getByRole("radio", { name: "Must" })).toBeChecked();
		expect(
			screen.getByText(
				"Asked “if possible”, the roster may pass this figure when a shift could not be staffed otherwise, and each time it does is listed in Issues."
			)
		).toBeVisible();
		await user.click(screen.getByRole("radio", { name: "If possible" }));
		await user.click(submitButton());

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "MAX_WORK_HOURS_PER_DAY",
					requirement: "SHOULD",
					lock: "LOCKED",
				})
			);
		});
	});

	it("given_theLockedMostHoursADay_when_aDepartmentMakesItIfPossible_then_refusedBeforeSending", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ replacing: MOST_HOURS_A_DAY_FIXTURE });
		await screen.findByRole("dialog", { name: "Set for this department" });
		await typeName(user, "Kitchen hours");

		await user.click(screen.getByRole("radio", { name: "If possible" }));
		await user.click(submitButton());

		expect(
			await screen.findByText(
				"These values wouldn’t be at least as strict as the company’s locked constraint in every part. Make them stricter, or keep the company’s."
			)
		).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();
	});

	it("given_aNewCompanyRule_when_added_then_itsTypeCanBeChosen", async () => {
		renderDialog({ withLock: true });
		await screen.findByRole("dialog", { name: "Add constraint" });

		expect(
			screen.getByRole("radio", { name: "Rest between shifts" })
		).toBeVisible();
	});

	it("given_theApiRefusesAsNotStricter_when_saved_then_explainsIt", async () => {
		const user = userEvent.setup();
		const onSave = vi
			.fn()
			.mockRejectedValue(problem(409, "CONSTRAINT_OVERRIDE_NOT_STRICTER"));
		renderDialog({ replacing: companyWeekends, onSave });
		await screen.findByRole("dialog", { name: "Set for this department" });

		await typeName(user, "No weekends");
		await user.click(submitButton());

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
		await start(user, "Rest between shifts");

		await user.click(screen.getByRole("radio", { name: "Chosen departments" }));
		await pick(user, /^Chosen departments/, "Kitchen", "Bar");
		// The preview says where it will apply before it is saved.
		expect(screen.getByText("Bar, Kitchen")).toBeVisible();
		await user.type(
			screen.getByRole("spinbutton", { name: /^Hours off/ }),
			"11"
		);
		await user.click(submitButton());

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
		await start(user, "Rest between shifts");

		await user.click(screen.getByRole("radio", { name: "Chosen branches" }));
		await user.type(
			screen.getByRole("spinbutton", { name: /^Hours off/ }),
			"11"
		);
		await user.click(submitButton());

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
	it("given_noTypeYet_when_rendered_then_offersEveryTypeAsACardUnderItsCategory", async () => {
		renderDialog();
		await screen.findByRole("dialog", {
			name: "Add constraint",
			description: "Step 1 of 2: choose what it decides",
		});

		expect(screen.queryByRole("spinbutton")).toBeNull();
		expect(screen.queryByRole("textbox", { name: /^Name/ })).toBeNull();
		expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
		expect(
			screen.getAllByRole("radio").map((radio) => radio.getAttribute("value"))
		).toEqual(
			typeGroupsOf(CONSTRAINT_TYPE_OPTIONS).flatMap((group) =>
				group.types.map((option) => option.type)
			)
		);
		for (const [category, count] of [
			["People on shifts", 2],
			["On duty throughout", 1],
			["Days off", 4],
			["Rest and hours", 4],
		] as const)
			expect(
				within(screen.getByRole("radiogroup", { name: category })).getAllByRole(
					"radio"
				)
			).toHaveLength(count);
	});

	it("given_aKindChosen_when_continued_then_theFormKeepsItAtTheTopAndChangeGoesBack", async () => {
		const user = userEvent.setup();
		renderDialog();
		await chooseType(user, "Rest between shifts");

		expect(
			screen.getByRole("dialog", { description: "Step 2 of 2" })
		).toBeVisible();
		// Continue only moves on: nothing is checked or refused yet.
		expect(screen.queryByRole("alert")).toBeNull();
		expect(
			screen.getByText("The shortest gap between one shift and the next.")
		).toBeVisible();
		await user.click(changeTypeLink()!);

		expect(
			screen.getByRole("radio", { name: "Rest between shifts" })
		).toBeChecked();
	});

	it("given_payRates_when_chosen_then_explainsThemselvesWithNoFirmnessAndNoTimeOff", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog();
		await start(user, "Pay rates for extra hours");

		expect(
			screen.getByText(
				"These rates only guide which roster the engine prefers; they are not used for pay."
			)
		).toBeVisible();
		expect(screen.queryByRole("radiogroup", { name: /^How firm/ })).toBeNull();
		expect(screen.queryByText(/Time off earned/)).toBeNull();
		expect(
			screen.getByText("0 to 1000. MOM’s rate is 150, 1.5 times a normal hour.")
		).toBeVisible();
		await user.type(
			screen.getByRole("spinbutton", { name: /^An hour of overtime costs/ }),
			"150"
		);
		await user.type(
			screen.getByRole("spinbutton", {
				name: /^An hour of work on a rest day costs/,
			}),
			"200"
		);
		expect(
			screen.getByRole("radio", { name: "Counts as ordinary hours" })
		).toBeChecked();
		await user.click(
			screen.getByRole("radio", { name: "Costs this % of a normal hour" })
		);
		await user.type(
			screen.getByRole("spinbutton", { name: /^Work on a day off/ }),
			"120"
		);
		expect(
			screen.getByRole("region", { name: "How it reads" })
		).toHaveTextContent(
			"An hour of work on a day off costs 120% of a normal hour."
		);
		await user.click(submitButton());

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "PAY_RATES",
					requirement: null,
					values: [
						{ field: "OVERTIME_PERCENT", value: "150" },
						{ field: "REST_DAY_WORK_PERCENT", value: "200" },
						{ field: "DAY_OFF_WORK_PERCENT", value: "120" },
					],
				})
			);
		});
	});

	it("given_payRatesWithADayOffCountedAsOrdinary_when_saved_then_sendsNoDayOffRate", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog();
		await start(user, "Pay rates for extra hours");

		await user.type(
			screen.getByRole("spinbutton", { name: /^An hour of overtime costs/ }),
			"150"
		);
		await user.type(
			screen.getByRole("spinbutton", {
				name: /^An hour of work on a rest day costs/,
			}),
			"200"
		);
		await user.click(submitButton());

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					values: [
						{ field: "OVERTIME_PERCENT", value: "150" },
						{ field: "REST_DAY_WORK_PERCENT", value: "200" },
					],
				})
			);
		});
	});

	it("given_restBetweenShifts_when_chosen_then_offersMustOrIfPossibleAndSendsTheChoice", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog();
		await start(user, "Rest between shifts");

		await user.click(screen.getByRole("radio", { name: /^If possible/ }));
		await user.type(
			screen.getByRole("spinbutton", { name: /^Hours off/ }),
			"11"
		);
		await user.click(submitButton());

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "REST_BETWEEN_SHIFTS",
					requirement: "SHOULD",
				})
			);
		});
	});

	it("given_callBacks_when_noneAllowed_then_zeroIsSent", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog();
		await start(user, "Call-backs on a rest or off day");

		await user.type(
			screen.getByRole("spinbutton", { name: /^Most call-backs a person/ }),
			"0"
		);
		await user.click(submitButton());

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "MAX_CALL_BACKS_PER_PERSON",
					values: [{ field: "CALL_BACKS", value: "0" }],
				})
			);
		});
	});

	it("given_aStaffingRule_when_aWholeShiftGroupIsChosen_then_everyShiftOfTheGroupIsSavedAndTheirJobTitlesShareNone", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog();
		await start(user, "People on a shift");

		await user.click(trigger(/^Shifts/));
		await user.click(
			await screen.findByRole("option", { name: "Whole group: Service" })
		);
		await user.keyboard("{Escape}");

		expect(trigger(/^Shifts/)).toHaveTextContent("3 selected");
		await user.click(trigger(/^Job titles that count/));
		expect(
			await screen.findByText(
				"The chosen shifts share no job title. Choose shifts that take the same job title, or fewer shifts."
			)
		).toBeVisible();
		await user.keyboard("{Escape}");
		await user.click(submitButton());
		expect(onSave).not.toHaveBeenCalled();
	});

	it("given_jobTitlesChosen_when_aWholeShiftGroupIsChosen_then_aJobTitleTheGroupDoesNotAllListIsRemovedAndSaid", async () => {
		const user = userEvent.setup();
		renderDialog();
		await start(user, "People on a shift");
		await pick(user, /^Shifts/, "Lunch Rush");
		await pick(user, /^Job titles that count/, "Cashier");

		await user.click(trigger(/^Shifts/));
		await user.click(
			await screen.findByRole("option", { name: "Whole group: Service" })
		);
		await user.keyboard("{Escape}");

		expect(
			await screen.findByText(
				"Cashier was removed: not everything chosen in Shifts lists it."
			)
		).toBeVisible();
		expect(trigger(/^Shifts/)).toHaveTextContent("3 selected");
	});

	it("given_theChooser_when_rendered_then_eachKindSaysWhatItDoesWithAWorkedExample", async () => {
		renderDialog();

		expect(
			await screen.findByRole("radio", { name: "Rest between shifts" })
		).toHaveAccessibleDescription(
			"The shortest gap between one shift and the next.For example: Everyone gets at least 11 hours off between shifts."
		);
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

		await user.click(submitButton());

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
		await pick(user, /^Shifts/, "Front Desk AM");
		await pick(
			user,
			/^Job titles that count/,
			"Front Desk Staff",
			"Front Desk Lead"
		);
		expect(
			screen.getByRole("region", { name: "How it reads" })
		).toHaveTextContent(
			"Must Front Desk AM needs at least 2 people as Front Desk Lead or Front Desk Staff.Front Desk AM"
		);
		await user.click(submitButton());

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
		await start(user, "Days off each week");
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

		await chooseType(user, "People on a shift");
		expect(nameField()).toHaveValue("People on a shift");
		await pick(user, /^Shifts/, "Front Desk AM");
		expect(nameField()).toHaveValue("Front Desk AM staffing");

		await typeName(user, "Morning cover");
		await pick(user, /^Shifts/, "Breakfast Prep");
		expect(nameField()).toHaveValue("Morning cover");
	});

	it("given_noShiftYet_when_jobTitlesOpened_then_asksForAShiftFirst", async () => {
		const user = userEvent.setup();
		renderDialog();
		await start(user, "People on a shift");

		await user.click(trigger(/^Job titles that count/));

		expect(await screen.findByText("Choose in Shifts first.")).toBeVisible();
		expect(screen.queryByRole("option", { name: "Cashier" })).toBeNull();
	});

	it("given_aShiftChosen_when_jobTitlesOpened_then_offersOnlyTheOnesItLists", async () => {
		const user = userEvent.setup();
		renderDialog();
		await start(user, "People on a shift");
		await pick(user, /^Shifts/, "Front Desk AM");

		await user.click(trigger(/^Job titles that count/));

		const listbox = await screen.findByRole("listbox");
		expect(
			within(listbox)
				.getAllByRole("option")
				.map((option) => option.textContent)
		).toEqual(expect.arrayContaining(["Front Desk Lead", "Front Desk Staff"]));
		expect(
			within(listbox).queryByRole("option", { name: "Cashier" })
		).toBeNull();
	});

	it("given_aSecondShiftChosen_when_jobTitlesOutsideTheOverlap_then_takesThemOutAndSaysSo", async () => {
		const user = userEvent.setup();
		renderDialog();
		await start(user, "People on a shift");
		await pick(user, /^Shifts/, "Lunch Rush");
		await pick(user, /^Job titles that count/, "Cashier", "Supervisor");

		// Closing Crew takes Supervisor but not Cashier.
		await pick(user, /^Shifts/, "Closing Crew");

		expect(
			screen.getByText(
				"Cashier was removed: not everything chosen in Shifts lists it."
			)
		).toBeVisible();
		expect(trigger(/^Job titles that count/)).toHaveTextContent("Supervisor");
		expect(trigger(/^Job titles that count/)).not.toHaveTextContent("Cashier");
	});

	it("given_twoShiftsThatShareNoJobTitle_when_jobTitlesOpened_then_saysTheyShareNone", async () => {
		const user = userEvent.setup();
		renderDialog();
		await start(user, "People on a shift");
		await pick(user, /^Shifts/, "Front Desk AM", "Lunch Rush");

		await user.click(trigger(/^Job titles that count/));

		expect(
			await screen.findByText(
				"The chosen shifts share no job title. Choose shifts that take the same job title, or fewer shifts."
			)
		).toBeVisible();
		expect(screen.queryByRole("option", { name: "Cashier" })).toBeNull();
	});

	it("given_oneShiftThatListsNoneOffered_when_jobTitlesOpened_then_keepsTheOneShiftLine", async () => {
		const user = userEvent.setup();
		renderDialog();
		await start(user, "People on a shift");
		await pick(user, /^Shifts/, "Concierge Support");

		await user.click(trigger(/^Job titles that count/));

		expect(
			await screen.findByText("Nothing chosen in Shifts lists one yet.")
		).toBeVisible();
		expect(
			screen.queryByText(/The chosen shifts share no job title/)
		).toBeNull();
	});

	it("given_aSavedRuleWithValuesThatNoLongerFit_when_opened_then_takesThemOutAndNamesThem", async () => {
		const stale = constraint("closing-supervisor");
		renderDialog({
			editing: {
				...stale,
				values: stale.values.map((value) =>
					value.field === "JOB_TITLE"
						? { ...value, problem: "NOT_LISTED" }
						: value
				),
			},
		});
		await screen.findByRole("dialog", { name: "Edit constraint" });

		const names = stale.values
			.filter((value) => value.field === "JOB_TITLE")
			.map((value) => value.name);
		expect(
			screen.getByText(
				`These no longer fit and were taken out: ${names.join(", ")}. Save to keep the constraint without them, or choose again.`
			)
		).toBeVisible();
		for (const name of names)
			expect(trigger(/^Job titles that count/)).not.toHaveTextContent(name!);
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

	it("given_daysToAvoidGivingOff_when_added_then_startsIfPossibleAndSendsIt", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog();
		await start(user, "Days to avoid giving off");

		expect(screen.getByRole("radio", { name: /^If possible/ })).toBeChecked();
		await pick(user, /^Days of the week/, "Saturday", "Friday");
		await user.click(submitButton());

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "AVOID_DAYS_OFF_ON",
					requirement: "SHOULD",
					// Monday first, whatever order they were chosen in.
					values: [
						{ field: "WEEKDAY", value: "FRI" },
						{ field: "WEEKDAY", value: "SAT" },
					],
				})
			);
		});
	});

	it("given_keepDaysOffTogetherAsAMust_when_saved_then_saysScatteredDaysCannotKeepItAndSendsMust", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog();
		await start(user, "Keep days off together");
		const scattered =
			"As a Must, someone whose available days are scattered, such as a part-timer on Monday, Wednesday and Friday, cannot keep it, so it is best applied to full-timers.";

		expect(screen.getByRole("radio", { name: /^If possible/ })).toBeChecked();
		expect(screen.queryByText(scattered)).toBeNull();
		await user.click(screen.getByRole("radio", { name: /^Must/ }));
		expect(screen.getByText(scattered)).toBeVisible();
		await user.click(submitButton());

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "KEEP_DAYS_OFF_TOGETHER",
					requirement: "MUST",
					values: [],
				})
			);
		});
	});

	it("given_theWeeklyRule_when_edited_then_offersItsComparisonsNumberAndOneNonWorkingDayType", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({
			withLock: true,
			editing: WEEKLY_RULE_FIXTURE,
			reach: { choices: REACH.choices, initial: reachValueOf() },
		});
		await screen.findByRole("dialog", { name: "Edit constraint" });

		expect(screen.getByText("Required days each week")).toBeVisible();
		expect(changeTypeLink()).toBeNull();
		expect(screen.queryByRole("button", { name: /^Lock/ })).toBeNull();
		expect(screen.queryByRole("button", { name: /^Status/ })).toBeNull();
		expect(screen.queryByRole("radiogroup", { name: /Applies to/ })).toBeNull();
		expect(trigger(/^Day types/)).toHaveTextContent("Rest day");
		expect(trigger(/^Day types/)).toBeEnabled();
		await user.click(trigger(/^Day types/));
		// The non-working day types only: never leave (ADR-0087).
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Day off", "Rest day"]);
		await user.click(screen.getByRole("option", { name: "Day off" }));
		await user.click(trigger(/^At least, at most or exactly/));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["At least", "Exactly"]);
		await user.click(screen.getByRole("option", { name: "Exactly" }));
		await user.click(submitButton());

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "DAY_TYPE_DAYS_PER_WEEK",
					lock: "LOCKED",
					values: [
						{ field: "COMPARISON", value: "EXACTLY" },
						{ field: "DAY_TYPE_COUNT", value: "1" },
						{ field: "DAY_TYPE", value: "OFF" },
					],
				})
			);
		});
	});

	it("given_theWeeklyRuleReplacedByADepartment_when_opened_then_itsDayTypeStaysTheCompanys", async () => {
		renderDialog({ replacing: WEEKLY_RULE_FIXTURE });
		await screen.findByRole("dialog", { name: "Set for this department" });

		expect(trigger(/^Day types/)).toHaveTextContent("Rest day");
		expect(trigger(/^Day types/)).toBeDisabled();
	});

	it("given_aNewDaysOffRule_when_chosen_then_everyNonWorkingDayTypeCountsAndAllComparisonsAreOffered", async () => {
		const user = userEvent.setup();
		renderDialog();
		await start(user, "Days off each week");

		expect(trigger(/^Day types/)).toHaveTextContent(/2/);
		await user.click(trigger(/^At least, at most or exactly/));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["At least", "At most", "Exactly"]);
	});

	it("given_aDaysOffRuleExactly_when_onlyDayOffCounts_then_keepsExactlyAndOffersAllThree", async () => {
		const user = userEvent.setup();
		renderDialog();
		await start(user, "Days off each week");
		await pick(user, /^At least, at most or exactly/, "Exactly");

		// Unticking Rest day leaves only Day off counted (ADR-0104).
		await pick(user, /^Day types/, "Rest day");

		expect(trigger(/^At least, at most or exactly/)).toHaveTextContent(
			"Exactly"
		);
		await user.click(trigger(/^At least, at most or exactly/));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["At least", "At most", "Exactly"]);
	});

	it("given_aPeopleType_when_chosen_then_offersAllThreeComparisons", async () => {
		const user = userEvent.setup();
		renderDialog();
		await start(user, "People on a shift");

		await user.click(trigger(/^At least, at most or exactly/));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["At least", "At most", "Exactly"]);
	});

	it("given_theDaysLimit_when_saved_then_offersTheApisDayTypesByLabelAndSendsTheChosenCodes", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({
			options: {
				status: "ready",
				options: {
					...CONSTRAINT_OPTIONS,
					dayTypeChoices: ["OFF", "REST", "LEAVE", "PUBLIC_HOLIDAY_OFF"],
				},
			},
		});
		await start(user, "Limit on days in a row");

		expect(screen.getByRole("radiogroup", { name: /^How firm/ })).toBeVisible();
		await user.click(screen.getByRole("radio", { name: /^Must/ }));
		expect(
			screen.getByRole("spinbutton", { name: /^Most days in a row/ })
		).toHaveAttribute("max", "14");
		await user.click(trigger(/^Day types/));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(
			expect.arrayContaining([
				"Day off",
				"Rest day",
				"Leave",
				"Public holiday off",
			])
		);
		await user.keyboard("{Escape}");
		await user.type(
			screen.getByRole("spinbutton", { name: /^Most days in a row/ }),
			"12"
		);
		await pick(user, /^Day types/, "Rest day", "Public holiday off");

		expect(
			screen.getByRole("region", { name: "How it reads" })
		).toHaveTextContent(
			"No full-timer goes more than 12 days in a row without a Rest day or Public holiday off."
		);
		await user.click(submitButton());
		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "MAX_DAYS_WITHOUT_DAY_TYPES",
					requirement: "MUST",
					values: [
						{ field: "DAYS_IN_A_ROW", value: "12" },
						{ field: "DAY_TYPE", value: "REST" },
						{ field: "DAY_TYPE", value: "PUBLIC_HOLIDAY_OFF" },
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
		await user.click(submitButton());

		expect(
			await screen.findByText("Enter a whole number from 1 to 24.")
		).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();
	});

	it("given_aConstraint_when_editing_then_startsFromItsValuesAndChecksAcrossFields", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ editing: constraint("two-days-off") });
		await screen.findByRole("dialog", { name: "Edit constraint" });
		const daysOff = screen.getByRole("spinbutton", { name: /^Days off/ });

		expect(nameField()).toHaveValue("Two days off");
		expect(screen.getByText("Days off each week")).toBeVisible();
		expect(screen.getByRole("radio", { name: "Must" })).toBeChecked();
		expect(trigger(/^At least, at most or exactly/)).toHaveTextContent(
			"At least"
		);
		expect(daysOff).toHaveValue(2);

		await user.clear(daysOff);
		await user.type(daysOff, "8");
		await user.click(submitButton());
		expect(
			await screen.findByText(
				"Days off can’t be more than the days in the period."
			)
		).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();

		await user.clear(daysOff);
		await user.type(daysOff, "2");
		await user.click(submitButton());

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith({
				name: "Two days off",
				type: "DAYS_OFF_PER_PERIOD",
				requirement: "MUST",
				status: "ACTIVE",
				values: [
					{ field: "COMPARISON", value: "AT_LEAST" },
					{ field: "DAYS_OFF", value: "2" },
					{ field: "PERIOD_WEEKS", value: "1" },
				],
			});
		});
	});

	it("given_aDaysOffConstraint_when_itsPeriodIsChosen_then_offeredAsEveryWeekToEvery4WeeksAndSentInWeeks", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ editing: constraint("two-days-off") });
		await screen.findByRole("dialog", { name: "Edit constraint" });

		expect(trigger(/^How often/)).toHaveTextContent("Every week");
		expect(
			screen.getByText(
				"Weeks run Monday to Sunday. A period of 2 to 4 weeks is a fixed block that carries on from one schedule to the next."
			)
		).toBeVisible();
		await user.click(trigger(/^How often/));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual([
			"Every week",
			"Every 2 weeks",
			"Every 3 weeks",
			"Every 4 weeks",
		]);
		await user.click(screen.getByRole("option", { name: "Every 2 weeks" }));
		const daysOff = screen.getByRole("spinbutton", { name: /^Days off/ });
		await user.clear(daysOff);
		await user.type(daysOff, "8");
		await user.click(submitButton());

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					values: [
						{ field: "COMPARISON", value: "AT_LEAST" },
						{ field: "DAYS_OFF", value: "8" },
						{ field: "PERIOD_WEEKS", value: "2" },
					],
				})
			);
		});
	});

	it("given_aDaysOffConstraintThatKeptItsPeriodInDays_when_edited_then_asksForAPeriodInWeeksAndSendsNoDays", async () => {
		const user = userEvent.setup();
		const twoDaysOff = constraint("two-days-off");
		const { onSave } = renderDialog({
			editing: {
				...twoDaysOff,
				values: [
					...twoDaysOff.values.filter(
						(value) => value.field !== "PERIOD_WEEKS"
					),
					{
						field: "PERIOD_DAYS",
						value: "6",
						name: null,
						problem: "PERIOD_IN_DAYS",
					},
				],
			},
		});
		await screen.findByRole("dialog", { name: "Edit constraint" });

		await user.click(submitButton());
		expect(await screen.findByText("Choose one.")).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();

		await pick(user, /^How often/, "Every week");
		await user.click(submitButton());

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					values: [
						{ field: "COMPARISON", value: "AT_LEAST" },
						{ field: "DAYS_OFF", value: "2" },
						{ field: "PERIOD_WEEKS", value: "1" },
					],
				})
			);
		});
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

			await user.click(submitButton());

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
		expect(screen.queryByRole("radio")).toBeNull();
		expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
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

	it("given_noDepartmentYet_when_rendered_then_asksForTheDepartmentFirstAndOffersNoKind", async () => {
		const user = userEvent.setup();
		renderInCompany(<ChoosingDialog initial="" />);
		await screen.findByRole("dialog", { name: "Add constraint" });

		expect(screen.getByText("Choose a department first.")).toBeVisible();
		expect(screen.queryByRole("radio")).toBeNull();
		expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

		await user.click(trigger(/^Department/));
		await user.click(screen.getByRole("option", { name: /Front Office/ }));
		await user.click(
			await screen.findByRole("radio", { name: "Rest between shifts" })
		);
		expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
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
		expect(screen.getByText("Rest between shifts")).toBeVisible();
	});

	it("given_aFixedDepartmentAndANote_when_editing_then_namesTheDepartmentUnderTheTitleAndShowsTheNote", async () => {
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

		expect(
			screen.getByRole("dialog", { description: "Main branch › Front Office" })
		).toBeVisible();
		expect(screen.queryByRole("button", { name: /^Department/ })).toBeNull();
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
					"Already chosen in Job titles that count: choose it in one place only.",
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
