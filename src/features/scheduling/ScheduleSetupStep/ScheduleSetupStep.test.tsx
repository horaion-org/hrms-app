import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import type { FunctionComponent } from "@/common/types";
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { authTestI18n } from "@/features/auth/testingI18n";
import { partTimeReadinessQuery } from "@/features/availability/api";
import { periodStartingOn } from "@/features/scheduling/periods";
import { publishedWeekQuery } from "@/features/scheduling/publishedWeek/api";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
import {
	ScheduleSetupStep,
	type ScheduleSetupStepProps,
} from "@/features/scheduling/ScheduleSetupStep";
import { workspaceQuery, type Workspace } from "@/features/workspace/api";

const PERIODS = [
	periodStartingOn("2026-10-12"),
	periodStartingOn("2026-10-19"),
];

const DEFAULTS = {
	departmentId: "",
	name: "",
	periodStart: "2026-10-12",
	includeLeave: true,
	allowOpenShifts: false,
};

const clientWith = (workspace: Workspace): QueryClient => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	client.setQueryData(workspaceQuery.queryKey, workspace);
	return client;
};

const Harness = ({
	workspace = schedulingWorkspace(["schedule:read", "schedule:create"]),
	client = clientWith(workspace),
	...props
}: Partial<ScheduleSetupStepProps> & {
	workspace?: Workspace;
	client?: QueryClient;
}): FunctionComponent => (
	<I18nextProvider i18n={authTestI18n}>
		<QueryClientProvider client={client}>
			<ScheduleSetupStep
				companyId="c-1"
				defaultValues={DEFAULTS}
				formId="setup"
				periods={PERIODS}
				onSubmit={vi.fn().mockResolvedValue(undefined)}
				{...props}
			/>
			<button form="setup" type="submit">
				Next
			</button>
		</QueryClientProvider>
	</I18nextProvider>
);

describe("ScheduleSetupStep", () => {
	it("given_nothingEntered_when_submitted_then_asksForDepartmentAndName", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		render(<Harness onSubmit={onSubmit} />);

		await user.click(screen.getByRole("button", { name: "Next" }));

		expect(await screen.findByText("Choose a department.")).toBeVisible();
		expect(screen.getByText("Enter a schedule name.")).toBeVisible();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("given_everythingChosen_when_submitted_then_reportsTheSetup", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		render(<Harness onSubmit={onSubmit} />);

		await user.click(screen.getByRole("button", { name: /Department/ }));
		await user.click(await screen.findByRole("option", { name: "Kitchen" }));
		await user.type(
			screen.getByRole("textbox", { name: /Schedule name/ }),
			"  Kitchen - Week 42 "
		);
		await user.click(screen.getByRole("button", { name: /Schedule period/ }));
		await user.click(await screen.findByRole("option", { name: /19.+25/ }));
		await user.click(
			screen.getByRole("checkbox", { name: "Allow open shifts" })
		);
		await user.click(screen.getByRole("button", { name: "Next" }));

		await vi.waitFor(() => {
			expect(onSubmit).toHaveBeenCalledOnce();
		});
		expect(onSubmit.mock.calls[0]?.[0]).toEqual({
			departmentId: "d-2",
			name: "Kitchen - Week 42",
			periodStart: "2026-10-19",
			includeLeave: true,
			allowOpenShifts: true,
		});
	});

	it("given_theWorkspace_when_departmentsListed_then_offersOnlyActiveOnesWhereSchedulesMayBeCreated", async () => {
		const user = userEvent.setup();
		const workspace = schedulingWorkspace(["schedule:read"]);
		const kitchen = workspace.companies[0]?.branches[0]?.departments[1];
		kitchen?.permissions.push("schedule:create");
		render(<Harness workspace={workspace} />);

		await user.click(screen.getByRole("button", { name: /Department/ }));

		expect(
			(await screen.findAllByRole("option")).map((option) => option.textContent)
		).toEqual(["Kitchen"]);
	});

	it("given_noDepartmentToCreateIn_when_rendered_then_saysWhy", () => {
		render(<Harness workspace={schedulingWorkspace(["schedule:read"])} />);

		expect(
			screen.getByText(
				"You don’t have permission to create schedules in any active department."
			)
		).toBeVisible();
	});

	it("given_aNameOutsideTheRule_when_submitted_then_saysWhatIsAllowed", async () => {
		const user = userEvent.setup();
		render(
			<Harness
				defaultValues={{ ...DEFAULTS, departmentId: "d-1", name: "W" }}
			/>
		);

		await user.click(screen.getByRole("button", { name: "Next" }));

		expect(await screen.findByText("Use 2 to 100 characters.")).toBeVisible();
	});

	it("given_theSettings_when_rendered_then_eachIsDescribed", () => {
		render(<Harness />);

		expect(
			screen.getByRole("checkbox", { name: "Include leave requests" })
		).toHaveAccessibleDescription(
			"Consider approved leave when generating the schedule."
		);
		expect(screen.getByRole("note")).toHaveTextContent(
			"Select a period that aligns with your business operations."
		);
	});

	it("given_aDepartmentChosen_when_itChanges_then_tellsThePage", async () => {
		const user = userEvent.setup();
		const onDepartmentChange = vi.fn();
		render(<Harness onDepartmentChange={onDepartmentChange} />);

		await user.click(screen.getByRole("button", { name: /Department/ }));
		await user.click(await screen.findByRole("option", { name: "Kitchen" }));

		await vi.waitFor(() => {
			expect(onDepartmentChange).toHaveBeenLastCalledWith("d-2");
		});
	});

	it("given_aWeekChosen_when_itChanges_then_tellsThePage", async () => {
		const user = userEvent.setup();
		const onPeriodChange = vi.fn();
		render(<Harness onPeriodChange={onPeriodChange} />);

		await user.click(screen.getByRole("button", { name: /Schedule period/ }));
		await user.click(await screen.findByRole("option", { name: /19.+25/ }));

		await vi.waitFor(() => {
			expect(onPeriodChange).toHaveBeenLastCalledWith("2026-10-19");
		});
	});

	it("given_departmentExtras_when_rendered_then_showsThemBelowTheSchedulePeriod", () => {
		render(
			<Harness
				departmentExtras={<p>Uses all 3 shifts and 5 constraints of Kitchen.</p>}
			/>
		);

		const extras = screen.getByText(
			"Uses all 3 shifts and 5 constraints of Kitchen."
		);
		expect(
			screen
				.getByRole("button", { name: /Schedule period/ })
				.compareDocumentPosition(extras) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		expect(
			extras.compareDocumentPosition(
				screen.getByRole("checkbox", { name: "Include leave requests" })
			) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it("given_aSavedDraft_when_rendered_then_showsItsDepartmentWithoutAChoice", () => {
		render(
			<Harness
				defaultValues={{ ...DEFAULTS, departmentId: "d-9", name: "Week 42" }}
				lockedDepartment={{
					departmentId: "d-9",
					label: "Main branch › Concierge",
				}}
			/>
		);

		const department = screen.getByRole("button", { name: /Department/ });
		expect(department).toBeDisabled();
		expect(department).toHaveTextContent("Main branch › Concierge");
		expect(
			screen.getByText("A saved draft stays with its department.")
		).toBeVisible();
	});

	it("given_readOnly_when_rendered_then_nothingCanBeChangedButItStillSubmits", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		render(
			<Harness
				readOnly
				defaultValues={{ ...DEFAULTS, departmentId: "d-1", name: "Week 42" }}
				lockedDepartment={{
					departmentId: "d-1",
					label: "Main branch › Front Office",
				}}
				onSubmit={onSubmit}
			/>
		);

		expect(
			screen.getByText(
				"The department and scheduling period this schedule was set up for."
			)
		).toBeVisible();
		expect(
			screen.getByRole("textbox", { name: /Schedule name/ })
		).toHaveAttribute("readonly");
		expect(
			screen.getByRole("button", { name: /Schedule period/ })
		).toBeDisabled();
		expect(
			screen.getByRole("checkbox", { name: "Include leave requests" })
		).toBeDisabled();
		await user.click(screen.getByRole("button", { name: "Next" }));
		await vi.waitFor(() => {
			expect(onSubmit).toHaveBeenCalledOnce();
		});
	});

	it("given_aRefusedField_when_submitted_then_showsItOnTheField", async () => {
		const user = userEvent.setup();
		render(
			<Harness
				defaultValues={{ ...DEFAULTS, departmentId: "d-1", name: "Week 42" }}
				onSubmit={vi
					.fn()
					.mockResolvedValue({ periodStart: "Choose a Monday." })}
			/>
		);

		await user.click(screen.getByRole("button", { name: "Next" }));

		expect(await screen.findByText("Choose a Monday.")).toBeVisible();
	});

	describe("part-timers without availability", () => {
		/** Kitchen's readiness for the week of 12 Oct answered with Kent, under a workspace holding `permissions`. */
		const kitchenWithKent = (permissions: Array<string>): QueryClient => {
			const client = clientWith(schedulingWorkspace(permissions));
			client.setQueryData(
				partTimeReadinessQuery(
					"c-1",
					{ branchId: "b-1", departmentId: "d-2" },
					"2026-10-12"
				).queryKey,
				[
					{
						membershipId: "m-1",
						memberProfileId: "p-1",
						displayName: "Kent Chua",
					},
				]
			);
			return client;
		};
		const kitchenDraft = { ...DEFAULTS, departmentId: "d-2", name: "Week 42" };

		it("given_workAvailabilityRead_when_aDepartmentAndWeekAreChosen_then_warnsAndNamesThemForThatWeek", async () => {
			render(
				<MemoryRouterHarness>
					<Harness
						defaultValues={kitchenDraft}
						client={kitchenWithKent([
							"schedule:read",
							"schedule:create",
							"work_availability:read",
						])}
					/>
				</MemoryRouterHarness>
			);

			expect(
				await screen.findByText(
					"1 part-time member has no availability and will be left off the roster:"
				)
			).toBeVisible();
			expect(screen.getByRole("link", { name: "Kent Chua" })).toHaveAttribute(
				"href",
				"/availability?view=team&branch=b-1&department=d-2&week=2026-10-12"
			);
		});

		it("given_theWarningShown_when_nextIsPressed_then_stillGoesAhead", async () => {
			const user = userEvent.setup();
			const onSubmit = vi.fn().mockResolvedValue(undefined);
			render(
				<MemoryRouterHarness>
					<Harness
						defaultValues={kitchenDraft}
						client={kitchenWithKent([
							"schedule:read",
							"schedule:create",
							"work_availability:read",
						])}
						onSubmit={onSubmit}
					/>
				</MemoryRouterHarness>
			);
			await screen.findByText(
				"1 part-time member has no availability and will be left off the roster:"
			);

			const next = screen.getByRole("button", { name: "Next" });
			expect(next).toBeEnabled();
			await user.click(next);

			await vi.waitFor(() => {
				expect(onSubmit).toHaveBeenCalledOnce();
			});
		});

		it("given_noWorkAvailabilityRead_when_aDepartmentIsChosen_then_saysNothing", async () => {
			render(
				<MemoryRouterHarness>
					<Harness
						client={kitchenWithKent(["schedule:read", "schedule:create"])}
						defaultValues={kitchenDraft}
					/>
				</MemoryRouterHarness>
			);

			expect(
				await screen.findByRole("textbox", { name: /Schedule name/ })
			).toBeVisible();
			expect(screen.queryByText(/part-time/)).not.toBeInTheDocument();
		});
	});

	describe("a week already published", () => {
		/** Kitchen's week of 12 Oct answered as published by s-9, under a workspace holding `permissions`. */
		const kitchenPublished = (permissions: Array<string>): QueryClient => {
			const client = clientWith(schedulingWorkspace(permissions));
			client.setQueryData(
				publishedWeekQuery(
					"c-1",
					{ branchId: "b-1", departmentId: "d-2" },
					"2026-10-12"
				).queryKey,
				{ periodStart: "2026-10-12", scheduleId: "s-9" }
			);
			return client;
		};
		const kitchenDraft = { ...DEFAULTS, departmentId: "d-2", name: "Week 42" };
		const warning =
			/already has a published roster for this department. Only one roster can be published per week, so pick another week/;

		it("given_scheduleRead_when_thePublishedWeekIsChosen_then_warnsLinksTheRosterAndStillGoesAhead", async () => {
			const user = userEvent.setup();
			const onSubmit = vi.fn().mockResolvedValue(undefined);
			render(
				<MemoryRouterHarness>
					<Harness
						client={kitchenPublished(["schedule:read", "schedule:create"])}
						defaultValues={kitchenDraft}
						onSubmit={onSubmit}
					/>
				</MemoryRouterHarness>
			);

			const note = await screen.findByText(warning);
			expect(
				within(note.closest("[role=note]") as HTMLElement).getByRole("link", {
					name: "Open the published roster",
				})
			).toHaveAttribute("href", "/scheduling/s-9");
			await user.click(screen.getByRole("button", { name: "Next" }));
			await vi.waitFor(() => {
				expect(onSubmit).toHaveBeenCalledOnce();
			});
		});

		it("given_anotherWeekChosen_when_rendered_then_saysNothing", async () => {
			render(
				<MemoryRouterHarness>
					<Harness
						client={kitchenPublished(["schedule:read", "schedule:create"])}
						defaultValues={{ ...kitchenDraft, periodStart: "2026-10-19" }}
					/>
				</MemoryRouterHarness>
			);

			expect(
				await screen.findByRole("textbox", { name: /Schedule name/ })
			).toBeVisible();
			expect(screen.queryByText(warning)).not.toBeInTheDocument();
		});

		it("given_noScheduleRead_when_thePublishedWeekIsChosen_then_asksNothingAndSaysNothing", async () => {
			const client = kitchenPublished(["schedule:create"]);
			render(
				<MemoryRouterHarness>
					<Harness client={client} defaultValues={kitchenDraft} />
				</MemoryRouterHarness>
			);

			expect(
				await screen.findByRole("textbox", { name: /Schedule name/ })
			).toBeVisible();
			expect(screen.queryByText(warning)).not.toBeInTheDocument();
		});

		it("given_readOnly_when_rendered_then_saysNothing", async () => {
			render(
				<MemoryRouterHarness>
					<Harness
						readOnly
						client={kitchenPublished(["schedule:read", "schedule:create"])}
						defaultValues={kitchenDraft}
					/>
				</MemoryRouterHarness>
			);

			expect(
				await screen.findByRole("textbox", { name: /Schedule name/ })
			).toBeVisible();
			expect(screen.queryByText(warning)).not.toBeInTheDocument();
		});
	});

	describe("weeks", () => {
		const placed = [
			{
				...periodStartingOn("2026-10-26"),
				relative: "last" as const,
				started: true,
			},
			{
				...periodStartingOn("2026-11-02"),
				relative: "this" as const,
				started: true,
			},
			{ ...periodStartingOn("2026-11-09"), relative: "next" as const },
			periodStartingOn("2026-11-16"),
		];

		it("given_weeksNextToToday_when_listed_then_eachNamesWhereItSits", async () => {
			const user = userEvent.setup();
			render(
				<Harness
					defaultValues={{ ...DEFAULTS, periodStart: "2026-11-09" }}
					periods={placed}
				/>
			);

			await user.click(screen.getByRole("button", { name: /Schedule period/ }));

			expect(
				(await screen.findAllByRole("option")).map(
					(option) => option.textContent
				)
			).toEqual([
				expect.stringMatching(/Oct 26.+Nov 1, 2026 · Last week$/u),
				expect.stringMatching(/Nov 2.+8, 2026 · This week$/u),
				expect.stringMatching(/Nov 9.+15, 2026 · Next week$/u),
				expect.stringMatching(/Nov 16.+22, 2026$/u),
			]);
		});

		it("given_aWeekThatHasStarted_when_chosen_then_saysItIsScheduledWhole", async () => {
			const user = userEvent.setup();
			render(
				<Harness
					defaultValues={{ ...DEFAULTS, periodStart: "2026-11-09" }}
					periods={placed}
				/>
			);
			const started =
				"This week has already begun. The schedule still covers all of it, including days that have passed.";
			expect(screen.queryByText(started)).not.toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: /Schedule period/ }));
			await user.click(
				await screen.findByRole("option", { name: /This week/ })
			);

			expect(await screen.findByText(started)).toBeVisible();
			expect(
				screen.getByRole("button", { name: /Schedule period/ })
			).toHaveAccessibleDescription(started);
		});

		it("given_aStartedWeekShownReadOnly_when_rendered_then_saysNothingAboutIt", () => {
			render(
				<Harness
					readOnly
					defaultValues={{ ...DEFAULTS, periodStart: "2026-10-26" }}
					periods={placed}
				/>
			);

			expect(screen.queryByText(/already begun/)).not.toBeInTheDocument();
		});
	});

	describe("the header's Branch", () => {
		// Orchard (Kitchen d-1, Bar d-2) and Tampines (Front d-3), created in anywhere.
		const twoBranches = companyWideWorkspace([
			"schedule:read",
			"schedule:create",
		]);

		it("given_oneBranch_when_departmentsListed_then_offersOnlyItsOwnByName", async () => {
			const user = userEvent.setup();
			render(<Harness branchId="b-2" workspace={twoBranches} />);

			await user.click(screen.getByRole("button", { name: "Department" }));

			expect(
				screen.getAllByRole("option").map((option) => option.textContent)
			).toEqual(["Front"]);
		});

		it("given_allBranches_when_departmentsListed_then_offersEachUnderItsBranch", async () => {
			const user = userEvent.setup();
			render(<Harness workspace={twoBranches} />);

			await user.click(screen.getByRole("button", { name: "Department" }));

			expect(
				within(screen.getByRole("group", { name: "Orchard" }))
					.getAllByRole("option")
					.map((option) => option.textContent)
			).toEqual(["Bar", "Kitchen"]);
			expect(
				within(screen.getByRole("group", { name: "Tampines" })).getByRole(
					"option",
					{ name: "Front" }
				)
			).toBeVisible();
		});

		it("given_aChosenDepartment_when_theBranchChangesAwayFromIt_then_letsItGo", async () => {
			const user = userEvent.setup();
			const client = clientWith(twoBranches);
			const { rerender } = render(
				<Harness branchId="b-1" client={client} workspace={twoBranches} />
			);
			await user.click(screen.getByRole("button", { name: "Department" }));
			await user.click(screen.getByRole("option", { name: "Kitchen" }));
			expect(
				screen.getByRole("button", { name: "Department" })
			).toHaveTextContent("Kitchen");

			// "All branches" still holds it.
			rerender(<Harness client={client} workspace={twoBranches} />);
			expect(
				screen.getByRole("button", { name: "Department" })
			).toHaveTextContent("Kitchen");

			rerender(
				<Harness branchId="b-2" client={client} workspace={twoBranches} />
			);
			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Department" })
				).toHaveTextContent("Select a department");
			});
		});

		it("given_aSavedDraft_when_theBranchDiffers_then_keepsItsLockedDepartment", () => {
			render(
				<Harness
					branchId="b-2"
					defaultValues={{ ...DEFAULTS, departmentId: "d-1" }}
					lockedDepartment={{ departmentId: "d-1", label: "Orchard › Kitchen" }}
					workspace={twoBranches}
				/>
			);

			expect(
				screen.getByRole("button", { name: "Department" })
			).toHaveTextContent("Orchard › Kitchen");
		});
	});
});
