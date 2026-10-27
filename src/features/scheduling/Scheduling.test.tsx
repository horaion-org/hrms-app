import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import { accessPassReply, envelope, stubApi } from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { exampleSchedules } from "@/features/scheduling/schedules";
import {
	generatedScheduleFixture,
	scheduleFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";

let app: OpenedApp | undefined;
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	localStorage.clear();
});

it("adds an API colleague to the preview roster when a shift is reassigned", async () => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": {
			status: 200,
			body: envelope(
				schedulingWorkspace(["schedule:read", "member_profile:read"])
			),
		},
		"GET /api/v1/companies/c-1/member-profiles": {
			status: 200,
			body: envelope({
				content: [
					{
						membershipId: "api-person",
						employeeCode: "EMP-1",
						displayName: "API colleague",
						email: "test@example.com",
						phone: null,
						branchId: "b-1",
						branchName: "Main branch",
						departmentId: "d-1",
						departmentName: "Front Office",
						jobTitleId: "j-1",
						jobTitleName: "Receptionist",
						status: "ACTIVE",
					},
				],
				page: { totalElements: 1 },
			}),
		},
	});
	const schedule = exampleSchedules(new Date()).current[0]!;
	app = await openApp(`/scheduling/${schedule.scheduleId}`);
	renderAuthApp(app);
	const user = userEvent.setup();
	await user.click(
		(await screen.findAllByRole("button", { name: /John Lim/ }))[0]!
	);
	await user.click(screen.getByRole("button", { name: "Reassign Shift" }));
	await user.click(
		screen.getByRole("button", { name: "Branch and department" })
	);
	await user.click(screen.getByRole("option", { name: /Front Office/ }));
	await waitFor(() => {
		expect(screen.getByRole("button", { name: "Assign to" })).toBeEnabled();
	});
	await user.click(screen.getByRole("button", { name: "Assign to" }));
	await user.click(
		await screen.findByRole("option", { name: "API colleague" })
	);
	await user.click(screen.getByRole("button", { name: "Reassign" }));
	expect(
		await screen.findByRole("button", { name: /API colleague/ })
	).toBeInTheDocument();
});

it("shows API history and links to the saved schedule instead of an example roster", async () => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": {
			status: 200,
			body: envelope(schedulingWorkspace(["schedule:read"])),
		},
		"GET /api/v1/companies/c-1/schedules": {
			status: 200,
			body: envelope({
				content: [scheduleFixture({ name: "API schedule" })],
				page: { hasNext: false },
			}),
		},
	});
	app = await openApp("/scheduling");
	renderAuthApp(app);
	const card = await screen.findByRole("region", { name: "API schedule" });
	expect(within(card).getByText("Draft")).toBeInTheDocument();
	expect(
		within(card).getByText("Main branch › Front Office")
	).toBeInTheDocument();
	expect(
		within(card).getByText("Included shifts").nextElementSibling
	).toHaveTextContent("4");
	expect(
		within(card).getByText("Applied constraints").nextElementSibling
	).toHaveTextContent("3");
	expect(
		within(card).getByText("Include leave").nextElementSibling
	).toHaveTextContent("Yes");
	expect(
		within(card).getByText("Allow open shifts").nextElementSibling
	).toHaveTextContent("No");
	expect(
		within(screen.getByRole("table")).getByText("API schedule")
	).toBeInTheDocument();
	expect(
		within(card).getByRole("link", { name: "View schedule API schedule" })
	).toHaveAttribute("href", expect.stringContaining("departmentId=d-1"));
	expect(screen.queryByText(/Example data:/)).not.toBeInTheDocument();
	expect(within(card).queryByText("Coverage")).not.toBeInTheDocument();
	expect(
		screen.getByRole("region", { name: "Original card preview" })
	).toBeInTheDocument();
});

it("labels and tones every API status in the history", async () => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const statuses = [
		{ status: "DRAFT", label: "Draft", background: "bg-neutral-400" },
		{
			status: "GENERATION_REQUESTED",
			label: "Generation requested",
			background: "bg-warning-100",
		},
		{ status: "GENERATED", label: "Generated", background: "bg-success-100" },
		{
			status: "GENERATION_FAILED",
			label: "Generation failed",
			background: "bg-error-100",
		},
	] as const;
	stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": {
			status: 200,
			body: envelope(schedulingWorkspace(["schedule:read"])),
		},
		"GET /api/v1/companies/c-1/schedules": {
			status: 200,
			body: envelope({
				content: statuses.map(({ status }) => {
					const overrides = { scheduleId: status, name: `${status} schedule` };
					return status === "DRAFT"
						? scheduleFixture(overrides)
						: generatedScheduleFixture({ ...overrides, status });
				}),
				page: { hasNext: false },
			}),
		},
	});
	app = await openApp("/scheduling");
	renderAuthApp(app);
	const history = await screen.findByRole("table", {
		name: "Schedule history",
	});
	for (const { status, label, background } of statuses) {
		const row = within(history).getByRole("row", {
			name: new RegExp(`^${status} schedule`),
		});
		expect(within(row).getByText(label)).toHaveClass(background);
	}
});
