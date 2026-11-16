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
	it("opens a request from its row's one action, where it is approved or rejected", async () => {
		const user = userEvent.setup();
		const onOpen = vi.fn();
		render(
			<MemoryRouterHarness>
				<LeaveToDecideCard
					canDecide={() => true}
					pending={pendingOf(1)}
					onOpen={onOpen}
				/>
			</MemoryRouterHarness>
		);

		await user.click(await screen.findByRole("button", { name: /^Review: / }));

		expect(onOpen).toHaveBeenCalledWith(
			expect.objectContaining({ leaveRequestId: "leave-0" }),
			"view"
		);
		expect(screen.getAllByRole("button")).toHaveLength(1);
	});

	it("only offers a look where the person may not decide", async () => {
		render(
			<MemoryRouterHarness>
				<LeaveToDecideCard
					canDecide={() => false}
					pending={pendingOf(1)}
					onOpen={() => {}}
				/>
			</MemoryRouterHarness>
		);

		expect(
			await screen.findByRole("button", { name: /^View: / })
		).toHaveTextContent("View");
	});

	it("lists three requests and links to the rest", async () => {
		render(
			<MemoryRouterHarness>
				<LeaveToDecideCard
					canDecide={() => true}
					pending={pendingOf(7)}
					onOpen={() => {}}
				/>
			</MemoryRouterHarness>
		);

		expect(await screen.findAllByRole("listitem")).toHaveLength(3);
		expect(screen.getByRole("link", { name: "See all 7" })).toHaveAttribute(
			"href",
			"/leave?view=requests"
		);
	});
});
