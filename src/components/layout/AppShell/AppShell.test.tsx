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

	it("stacks the rail on top below lg and beside the page from lg", () => {
		const { container } = render(
			<AppShell sidebar={<nav aria-label="Main navigation" />}>
				<h1>Dashboard</h1>
			</AppShell>
		);

		expect(container.firstElementChild).toHaveClass(
			"flex",
			"min-h-dvh",
			"flex-col",
			"lg:flex-row"
		);
	});

	it("places the header in the navigation bar's row below lg, one bar topping the page", () => {
		render(
			<AppShell header={<header>Bar</header>} sidebar={null}>
				<h1>Dashboard</h1>
			</AppShell>
		);

		expect(screen.getByRole("banner").parentElement).toHaveClass(
			"max-lg:absolute",
			"max-lg:top-0",
			"max-lg:inset-x-17",
			"max-lg:h-19"
		);
	});
});
