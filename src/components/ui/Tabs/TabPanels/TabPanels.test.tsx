import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { expect, it } from "vitest";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/Tabs";

it("passes panels container props and a ref through composed Tabs", () => {
	const ref = createRef<HTMLDivElement>();
	render(
		<Tabs>
			<TabList aria-label="Profile">
				<Tab>Overview</Tab>
			</TabList>
			<TabPanels
				ref={ref}
				className="profile-panels"
				data-testid="panels"
				title="Profile content"
			>
				<TabPanel>Overview content</TabPanel>
			</TabPanels>
		</Tabs>
	);
	expect(ref.current).toBe(screen.getByTestId("panels"));
	expect(screen.getByTestId("panels")).toHaveClass("profile-panels");
	expect(screen.getByTestId("panels")).toHaveAttribute(
		"title",
		"Profile content"
	);
	expect(screen.getByRole("tabpanel", { name: "Overview" })).toHaveTextContent(
		"Overview content"
	);
});
