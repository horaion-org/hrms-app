import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { MemberProfile } from "@/features/people/api";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
import { ReassignRosterShiftDialog } from "@/features/scheduling/ShiftDetailsPanel/ReassignRosterShiftDialog";
import { workspaceQuery } from "@/features/workspace/api";

vi.mock("@/features/organisation/useCurrentCompanyId", () => ({
	useCurrentCompanyId: (): string => "c-1",
}));
const PATH = "GET /api/v1/companies/c-1/member-profiles";
let client: QueryClient;
beforeEach(() => {
	client = new QueryClient();
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

const member = (
	membershipId: string,
	overrides: Partial<MemberProfile> = {}
): MemberProfile => ({
	membershipId,
	employeeCode: membershipId,
	displayName: membershipId,
	email: "test@example.com",
	phone: null,
	branchId: "b-1",
	branchName: "Main branch",
	departmentId: "d-1",
	departmentName: "Front Office",
	jobTitleId: "j-1",
	jobTitleName: "Receptionist",
	status: "ACTIVE",
	...overrides,
});
const open = (
	knownUnit = true,
	permissions = ["member_profile:read", "shift:read", "shift:update"]
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
		role: "Receptionist",
		location: "Main branch",
		kind: "full" as const,
		...(knownUnit ? { branchId: "b-1", departmentId: "d-1" } : {}),
	};
	render(
		<QueryClientProvider client={client}>
			<I18nextProvider i18n={authTestI18n}>
				<ReassignRosterShiftDialog
					action="reassign"
					period={{ start: "2026-10-12", end: "2026-10-18" }}
					shift={shift}
					staffId="current"
					staff={[
						{
							staffId: "demo",
							name: "Sample person",
							jobTitle: "Staff",
							shifts: [],
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

it("loads all pages and offers only other active members of the exact branch and department", async () => {
	const calls = stubApi({
		[PATH]: [
			{
				status: 200,
				body: envelope({
					content: [
						member("current"),
						member("wrong department", { departmentId: "d-2" }),
						member("wrong branch", { branchId: "b-2" }),
						member("inactive", { status: "INACTIVE" }),
					],
					page: { totalElements: 11 },
				}),
			},
			{
				status: 200,
				body: envelope({
					content: [member("eligible")],
					page: { totalElements: 11 },
				}),
			},
		],
	});
	const onApply = open();
	const user = userEvent.setup();
	await waitFor(() => {
		expect(screen.getByRole("button", { name: "Assign to" })).toBeEnabled();
	});
	await user.click(screen.getByRole("button", { name: "Assign to" }));
	expect(screen.getAllByRole("option")).toHaveLength(1);
	await user.click(screen.getByRole("option", { name: "eligible" }));
	await user.click(screen.getByRole("button", { name: "Reassign" }));
	await waitFor(() => {
		expect(onApply).toHaveBeenCalledWith(
			"eligible",
			expect.objectContaining({ branchId: "b-1", departmentId: "d-1" }),
			expect.objectContaining({ staffId: "eligible", name: "eligible" })
		);
	});
	expect(
		calls.map((call) => new URLSearchParams(call.search).get("page"))
	).toEqual(["0", "1"]);
	for (const call of calls) {
		expect(new URLSearchParams(call.search).get("branchId")).toBe("b-1");
		expect(new URLSearchParams(call.search).get("status")).toBe("ACTIVE");
	}
});

it("requires a unit for a sample shift and clears the staff selection when the unit changes", async () => {
	const calls = stubApi({
		[PATH]: {
			status: 200,
			body: envelope({
				content: [member("eligible")],
				page: { totalElements: 1 },
			}),
		},
	});
	open(false);
	const user = userEvent.setup();
	expect(calls).toHaveLength(0);
	expect(screen.getByRole("button", { name: "Reassign" })).toBeDisabled();
	await user.click(
		screen.getByRole("button", { name: "Branch and department" })
	);
	await user.click(screen.getByRole("option", { name: /Front Office/ }));
	await waitFor(() => {
		expect(screen.getByRole("button", { name: "Assign to" })).toBeEnabled();
	});
	await user.click(screen.getByRole("button", { name: "Assign to" }));
	await user.click(screen.getByRole("option", { name: "eligible" }));
	await user.click(
		screen.getByRole("button", { name: "Branch and department" })
	);
	await user.click(screen.getByRole("option", { name: /Kitchen/ }));
	expect(screen.getByRole("button", { name: "Reassign" })).toBeDisabled();
	expect(
		await screen.findByText(
			"No other active staff belong to this branch and department."
		)
	).toBeInTheDocument();
});

it("does not request or offer staff without profile-read permission at the unit", () => {
	const calls = stubApi({});
	open(true, ["shift:read"]);
	expect(screen.getByRole("button", { name: "Reassign" })).toBeDisabled();
	expect(calls).toHaveLength(0);
});
