import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
import { ApiRosterShiftDialog } from "@/features/scheduling/ShiftDetailsPanel/ApiRosterShiftDialog";
import { workspaceQuery } from "@/features/workspace/api";

vi.mock("@/features/organisation/useCurrentCompanyId", () => ({
	useCurrentCompanyId: (): string => "c-1",
}));

const ROLES =
	"GET /api/v1/companies/c-1/branches/b-1/departments/d-1/shift-role-options";
let client: QueryClient;
beforeEach(() => {
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	client.clear();
	resetApiClient();
	vi.unstubAllGlobals();
});

const open = (
	permissions = ["shift:read", "shift:update"]
): ReturnType<typeof vi.fn> => {
	client.setQueryData(
		workspaceQuery.queryKey,
		schedulingWorkspace(permissions)
	);
	const onApply = vi.fn();
	const shift = {
		shiftId: "s-1",
		date: "2026-10-12",
		start: "09:00",
		end: "17:00",
		breakMinutes: 60,
		role: "Sample role",
		location: "Sample location",
		kind: "full" as const,
	};
	render(
		<QueryClientProvider client={client}>
			<I18nextProvider i18n={authTestI18n}>
				<ApiRosterShiftDialog
					action="edit"
					period={{ start: "2026-10-12", end: "2026-10-18" }}
					shift={shift}
					staffId="one"
					staff={[
						{
							staffId: "one",
							name: "Aisha",
							jobTitle: "Staff",
							shifts: [shift],
						},
					]}
					onApply={onApply}
					onClose={() => {}}
				/>
			</I18nextProvider>
		</QueryClientProvider>
	);
	return onApply;
};

it("selects API roles and workspace locations by id and clears the role when department changes", async () => {
	const calls = stubApi({
		[ROLES]: {
			status: 200,
			body: envelope([{ jobTitleId: "j-1", name: "Receptionist" }]),
		},
		"GET /api/v1/companies/c-1/branches/b-1/departments/d-2/shift-role-options":
			{ status: 200, body: envelope([]) },
	});
	const user = userEvent.setup();
	const onApply = open();
	expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
	await user.click(screen.getByRole("button", { name: "Location" }));
	expect(
		screen.getByRole("option", { name: "Main branch" })
	).toBeInTheDocument();
	await user.keyboard("{Escape}");
	await user.click(screen.getByRole("button", { name: "Department" }));
	expect(
		screen.queryByRole("option", { name: /Archive/ })
	).not.toBeInTheDocument();
	await user.click(screen.getByRole("option", { name: /Front Office/ }));
	await waitFor(() =>
		expect(screen.getByRole("button", { name: "Role" })).toBeEnabled()
	);
	await user.click(screen.getByRole("button", { name: "Role" }));
	await user.click(screen.getByRole("option", { name: "Receptionist" }));
	await user.click(screen.getByRole("button", { name: "Save changes" }));
	await waitFor(() => {
		expect(onApply).toHaveBeenCalledWith(
			"one",
			expect.objectContaining({
				branchId: "b-1",
				departmentId: "d-1",
				jobTitleId: "j-1",
				role: "Receptionist",
				location: "Main branch",
			})
		);
	});
	expect(calls[0]?.path).toBe(ROLES.slice(4));
	await user.click(screen.getByRole("button", { name: "Department" }));
	await user.click(screen.getByRole("option", { name: /Kitchen/ }));
	expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
	expect(
		await screen.findByText("This department has no active job titles.")
	).toBeInTheDocument();
});

it("keeps saving disabled when the role API refuses access", async () => {
	stubApi({ [ROLES]: problemReply(403, "ACCESS_DENIED") });
	const user = userEvent.setup();
	open();
	await user.click(screen.getByRole("button", { name: "Department" }));
	await user.click(screen.getByRole("option", { name: /Front Office/ }));
	expect(
		await screen.findByText(
			"You do not have permission to view roles in this department."
		)
	).toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
});

it("offers no locations and makes no role requests without shift permission", () => {
	const calls = stubApi({});
	open(["shift:read"]);
	expect(
		screen.getByText(
			"No active locations are available with your shift permissions."
		)
	).toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
	expect(calls).toHaveLength(0);
});
