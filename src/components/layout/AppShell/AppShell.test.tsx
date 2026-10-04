import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "@/components/layout/AppShell";

describe("AppShell", () => {
	it("orders the rail, then the header, then the page as the main landmark", () => {
		render(
			<AppShell
				header={<header>Welcome</header>}
				sidebar={<nav aria-label="Main navigation" />}
			>
				<h1>Dashboard</h1>
			</AppShell>
		);

		const navigation = screen.getByRole("navigation", {
			name: "Main navigation",
		});
		const banner = screen.getByRole("banner");
		const main = screen.getByRole("main");
		expect(main).toContainElement(
			screen.getByRole("heading", { name: "Dashboard" })
		);
		expect(
			navigation.compareDocumentPosition(banner) &
				Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		expect(
			banner.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it("renders without a header", () => {
		render(
			<AppShell sidebar={<nav aria-label="Main navigation" />}>
				<h1>Dashboard</h1>
			</AppShell>
		);

		expect(screen.queryByRole("banner")).not.toBeInTheDocument();
		expect(screen.getByRole("main")).toBeVisible();
	});

	it("stacks the rail on top on narrow screens and beside the page from sm", () => {
		const { container } = render(
			<AppShell sidebar={<nav aria-label="Main navigation" />}>
				<h1>Dashboard</h1>
			</AppShell>
		);

		expect(container.firstElementChild).toHaveClass(
			"flex",
			"min-h-dvh",
			"flex-col",
			"sm:flex-row"
		);
	});
});
