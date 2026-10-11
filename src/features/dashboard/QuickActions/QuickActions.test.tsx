import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AddStaffIcon, GenerateScheduleIcon } from "@/components/ui/Icon";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { QuickActions } from "@/features/dashboard/QuickActions";

describe("QuickActions", () => {
	it("given_shortcuts_when_rendered_then_linksEachInOrder", async () => {
		render(
			<MemoryRouterHarness>
				<QuickActions
					label="Quick Actions"
					actions={[
						{ label: "Generate Schedule", icon: GenerateScheduleIcon, to: "/" },
						{ label: "Add Staff", icon: AddStaffIcon, to: "/register" },
					]}
				/>
			</MemoryRouterHarness>
		);

		const list = await screen.findByRole("list", { name: "Quick Actions" });
		const links = within(list).getAllByRole("link");
		expect(links.map((link) => link.textContent)).toEqual([
			"Generate Schedule",
			"Add Staff",
		]);
		expect(links[1]).toHaveAttribute("href", "/register");
	});
});
