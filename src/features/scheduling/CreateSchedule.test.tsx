import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	openApp,
	settled,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	envelope,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const DEPARTMENTS = "GET /api/v1/companies/c-1/departments";

let app: OpenedApp | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
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

const routes = (): Record<string, StubReply> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: {
		status: 200,
		body: envelope({
			companies: [
				{
					uuid: "c-1",
					name: "Company c-1",
					permissions: ["department:read"],
					branches: [],
				},
			],
		}),
	},
	[DEPARTMENTS]: {
		status: 200,
		body: envelope({
			content: [
				{
					departmentId: "d-1",
					branchId: "b-1",
					name: "Front Office",
					status: "ACTIVE",
				},
				{
					departmentId: "d-2",
					branchId: "b-1",
					name: "Kitchen",
					status: "ACTIVE",
				},
			],
			page: { totalElements: 2 },
		}),
	},
});

const open = async (entry: string): Promise<OpenedApp> => {
	stubApi(routes());
	app = await openApp(entry);
	renderAuthApp(app);
	return app;
};

const next = (): HTMLElement => screen.getByRole("button", { name: "Next" });

const completeSetup = async (
	user: ReturnType<typeof userEvent.setup>
): Promise<void> => {
	await user.click(await screen.findByRole("button", { name: /Department/ }));
	await user.click(await screen.findByRole("option", { name: "Front Office" }));
	await user.type(
		screen.getByRole("textbox", { name: /Schedule Name/ }),
		"Front Office – Week 42"
	);
	await user.click(next());
	await screen.findByRole("region", { name: "Select Shifts" });
};

describe("Create Schedule", () => {
	it("given_theSchedulingOverview_when_createClicked_then_opensSetup", async () => {
		const user = userEvent.setup();
		const opened = await open("/scheduling");

		await user.click(
			await screen.findByRole("link", { name: "Create Schedule" })
		);
		await settled(opened.router);

		expect(opened.router.state.location.pathname).toBe("/scheduling/new");
		expect(
			await screen.findByRole("heading", { level: 1, name: "Create Schedule" })
		).toBeVisible();
		expect(
			screen.getByRole("region", { name: "Schedule Setup" })
		).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Back to Overview" })
		).toHaveAttribute("href", "/scheduling");
	});

	it("given_aStepNotYetReached_when_linkedTo_then_returnsToSetup", async () => {
		const opened = await open("/scheduling/new?step=forecast");

		expect(
			await screen.findByRole("region", { name: "Schedule Setup" })
		).toBeVisible();
		await settled(opened.router);
		expect(opened.router.state.location.search).toEqual({ step: "setup" });
	});

	it("given_everyStep_when_completed_then_reachesGenerateWithTheSummary", async () => {
		const user = userEvent.setup();
		const opened = await open("/scheduling/new");

		await completeSetup(user);
		expect(opened.router.state.location.search).toEqual({ step: "shifts" });

		await user.click(next());
		await screen.findByRole("region", { name: "Scheduling Constraints" });

		await user.click(next());
		await screen.findByRole("region", { name: "Staffing Forecast" });
		// Lunch Rush allocates 7 of 6; bring it back within the shift's total.
		await user.click(
			screen.getByRole("button", { name: "Fewer Kitchen Runner" })
		);
		await user.click(next());

		await screen.findByRole("region", { name: "Ready to Generate" });
		const summary = screen.getByLabelText("Schedule summary");
		expect(
			within(summary)
				.getAllByRole("definition")
				.map((value) => value.textContent)
		).toEqual(["4", "18", "94%", "0"]);
		const generate = screen.getByRole("button", { name: "Generate" });
		expect(generate).toBeDisabled();
		expect(generate).toHaveAccessibleDescription(
			"Saving drafts and generating schedules aren’t available yet."
		);
		const stepper = screen.getByRole("navigation", { name: "Steps" });
		expect(
			within(stepper).getByRole("button", { name: /Setup.*completed/i })
		).toBeVisible();
	});

	it("given_aCompletedStep_when_revisited_then_keepsWhatWasEntered", async () => {
		const user = userEvent.setup();
		await open("/scheduling/new");
		await completeSetup(user);

		await user.click(screen.getByRole("button", { name: "Back" }));

		expect(
			await screen.findByRole("textbox", { name: /Schedule Name/ })
		).toHaveValue("Front Office – Week 42");
		expect(
			screen.getByRole("button", { name: /Department/ })
		).toHaveTextContent("Front Office");
	});

	it("given_noShiftsChosen_when_nextClicked_then_staysAndSaysWhy", async () => {
		const user = userEvent.setup();
		const opened = await open("/scheduling/new");
		await completeSetup(user);

		await user.click(screen.getByRole("checkbox", { name: "Select all" }));
		await user.click(screen.getByRole("checkbox", { name: "Select all" }));
		await user.click(next());

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Choose at least one shift to include in this schedule."
		);
		expect(opened.router.state.location.search).toEqual({ step: "shifts" });
	});

	it("given_anOverAllocatedShift_when_nextClicked_then_staysOnTheForecast", async () => {
		const user = userEvent.setup();
		const opened = await open("/scheduling/new");
		await completeSetup(user);
		await user.click(next());
		await screen.findByRole("region", { name: "Scheduling Constraints" });
		await user.click(next());
		await screen.findByRole("region", { name: "Staffing Forecast" });

		await user.click(next());

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Some shifts allocate more staff than they need."
		);
		expect(opened.router.state.location.search).toEqual({ step: "forecast" });
	});

	it("given_aConstraint_when_deleted_then_removesItAndConfirms", async () => {
		const user = userEvent.setup();
		await open("/scheduling/new");
		await completeSetup(user);
		await user.click(next());
		await screen.findByRole("region", { name: "Scheduling Constraints" });

		await user.click(
			screen.getByRole("button", { name: "Delete Rest Between Shifts" })
		);

		expect(
			screen.queryByRole("row", { name: /Rest Between Shifts/ })
		).toBeNull();
		await waitFor(() => {
			expect(screen.getByRole("status")).toHaveTextContent(
				"Constraint successfully deleted"
			);
		});
	});
});
