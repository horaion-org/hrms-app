import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { expect, it } from "vitest";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/Tabs";

it("labels and focuses the active panel while passing native props and a ref through", async () => {
	const user = userEvent.setup();
	const ref = createRef<HTMLDivElement>();
	render(
		<Tabs>
			<TabList aria-label="Profile">
				<Tab>Overview</Tab>
			</TabList>
			<TabPanels>
				<TabPanel
					ref={ref}
					className="overview-panel"
					data-testid="panel"
					title="Overview details"
				>
					Overview content
				</TabPanel>
			</TabPanels>
		</Tabs>
	);
	const panel = screen.getByRole("tabpanel", { name: "Overview" });
	expect(ref.current).toBe(panel);
	expect(panel).toBe(screen.getByTestId("panel"));
	expect(panel).toHaveClass("overview-panel");
	expect(panel).toHaveAttribute("title", "Overview details");
	await user.tab();
	await user.tab();
	expect(panel).toHaveFocus();
});
