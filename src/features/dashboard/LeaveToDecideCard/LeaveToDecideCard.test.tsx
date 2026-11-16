import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { LeaveToDecideCard } from "@/features/dashboard/LeaveToDecideCard";
import { leaveFixture } from "@/features/leave/fixtures";
import type { LeaveList } from "@/features/leave/useLeaveRequests";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

/** A ready list of `count` requests. */
const pendingOf = (count: number): LeaveList => ({
	status: "ready",
	items: Array.from({ length: count }, (_, index) =>
		leaveFixture({ leaveRequestId: `leave-${index}` })
	),
	total: count,
});

describe("LeaveToDecideCard", () => {
	it("opens a request to approve from its row", async () => {
		const user = userEvent.setup();
		const onOpen = vi.fn();
		const pending = pendingOf(1);
		render(
			<MemoryRouterHarness>
				<LeaveToDecideCard
					busy={false}
					canDecide={() => true}
					pending={pending}
					onOpen={onOpen}
				/>
			</MemoryRouterHarness>
		);

		await user.click(await screen.findByRole("button", { name: "Approve" }));

		expect(onOpen).toHaveBeenCalledWith(
			expect.objectContaining({ leaveRequestId: "leave-0" }),
			"approve"
		);
	});

	it("holds the decision where the person may not decide", async () => {
		render(
			<MemoryRouterHarness>
				<LeaveToDecideCard
					busy={false}
					canDecide={() => false}
					pending={pendingOf(1)}
					onOpen={() => {}}
				/>
			</MemoryRouterHarness>
		);

		expect(
			await screen.findByRole("button", { name: "Approve" })
		).toBeDisabled();
	});

	it("lists five requests and links to the rest", async () => {
		render(
			<MemoryRouterHarness>
				<LeaveToDecideCard
					busy={false}
					canDecide={() => true}
					pending={pendingOf(7)}
					onOpen={() => {}}
				/>
			</MemoryRouterHarness>
		);

		expect(await screen.findAllByRole("listitem")).toHaveLength(5);
		expect(screen.getByRole("link", { name: "See all 7" })).toHaveAttribute(
			"href",
			"/leave?view=requests"
		);
	});
});
