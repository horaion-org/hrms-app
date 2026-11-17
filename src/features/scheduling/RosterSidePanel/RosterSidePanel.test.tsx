import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactElement } from "react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { RosterSidePanel } from "@/features/scheduling/RosterSidePanel";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

describe("RosterSidePanel", () => {
	it("given_aPanel_when_opened_then_focusesItsHeadingAndClosesOnEscapeOrTheButton", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(
			<RosterSidePanel
				sections={[{ key: "body", content: <p>Body</p> }]}
				title="Issues"
				onClose={onClose}
			/>
		);

		expect(
			screen.getByRole("complementary", { name: "Issues" })
		).toHaveTextContent("Body");
		expect(screen.getByRole("heading", { name: "Issues" })).toHaveFocus();
		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("button", { name: "Close Issues" }));
		expect(onClose).toHaveBeenCalledTimes(2);
	});

	// Opened from a menu, the menu gives focus back to its own button: Escape must still close the panel.
	it("given_focusOutsideThePanel_when_escapeIsPressed_then_closesAndFocusReturnsToWhatOpenedIt", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const page = (panelOpen: boolean): ReactElement => (
			<>
				<button type="button">More actions</button>
				{panelOpen && (
					<RosterSidePanel
						sections={[{ key: "body", content: <p>Body</p> }]}
						title="Details"
						onClose={onClose}
					/>
				)}
			</>
		);
		const { rerender } = render(page(false));
		screen.getByRole("button", { name: "More actions" }).focus();
		rerender(page(true));
		screen.getByRole("button", { name: "More actions" }).focus();

		await user.keyboard("{Escape}");

		expect(onClose).toHaveBeenCalledOnce();
		expect(screen.getByRole("button", { name: "More actions" })).toHaveFocus();
	});

	it("given_theCloseButton_when_pressed_then_focusReturnsToTheButtonThatOpenedThePanel", async () => {
		const user = userEvent.setup();
		/** A toolbar button that opens the panel, as the roster's Issues button does. */
		const IssuesToggle = (): ReactElement => {
			const [open, setOpen] = useState(false);
			return (
				<>
					<button
						type="button"
						onClick={() => {
							setOpen(true);
						}}
					>
						Issues
					</button>
					{open && (
						<RosterSidePanel
							sections={[{ key: "body", content: <p>Body</p> }]}
							title="Issues"
							onClose={() => {
								setOpen(false);
							}}
						/>
					)}
				</>
			);
		};
		render(<IssuesToggle />);
		await user.click(screen.getByRole("button", { name: "Issues" }));
		expect(screen.getByRole("heading", { name: "Issues" })).toHaveFocus();

		await user.click(screen.getByRole("button", { name: "Close Issues" }));

		expect(screen.getByRole("button", { name: "Issues" })).toHaveFocus();
	});

	it("given_escapeInsideADialog_when_pressed_then_thePanelStaysOpen", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(
			<>
				<RosterSidePanel
					sections={[{ key: "body", content: <p>Body</p> }]}
					title="Issues"
					onClose={onClose}
				/>
				<div role="dialog">
					<button type="button">In the dialog</button>
				</div>
			</>
		);
		screen.getByRole("button", { name: "In the dialog" }).focus();

		await user.keyboard("{Escape}");

		expect(onClose).not.toHaveBeenCalled();
	});

	it("given_aSummary_when_rendered_then_itSitsUnderTheTitleOutsideTheScrollingList", () => {
		render(
			<RosterSidePanel
				sections={[{ key: "body", content: <p>Body</p> }]}
				summary={<p>6 to fix</p>}
				title="Issues"
				onClose={vi.fn()}
			/>
		);

		const summary = screen.getByText("6 to fix");
		expect(screen.getByRole("heading", { name: "Issues" }).nextSibling).toBe(
			summary
		);
		expect(summary.closest(".overflow-y-auto")).toBeNull();
	});

	it("given_sections_when_rendered_then_listsTheirItemsAndLeavesEmptyOnesOut", () => {
		render(
			<RosterSidePanel
				title="Changed"
				sections={[
					{ key: "empty", title: "Never shown", items: [] },
					{
						key: "days",
						title: "Days",
						items: [{ key: "a", title: "Aisha · Mon", lines: ["Off → AM"] }],
					},
				]}
				onClose={vi.fn()}
			/>
		);

		expect(screen.queryByRole("heading", { name: "Never shown" })).toBeNull();
		expect(screen.getByRole("listitem")).toHaveTextContent(
			"Aisha · MonOff → AM"
		);
	});

	it("given_anItemWithAnAction_when_rendered_then_itsButtonUnderTheLines", async () => {
		const onClick = vi.fn();
		render(
			<RosterSidePanel
				title="Issues"
				sections={[
					{
						key: "cover",
						items: [
							{
								key: "a",
								title: "Aisha · Sat",
								lines: ["Needs cover: Swing"],
								action: { label: "Find cover", onClick },
							},
						],
					},
				]}
				onClose={vi.fn()}
			/>
		);

		await userEvent.click(screen.getByRole("button", { name: "Find cover" }));

		expect(onClick).toHaveBeenCalledOnce();
	});

	// Bounded beside the grid, only the list scrolls: the header with its title and close button stays in view, and
	// every item stays in the tab order (scrolling never removes anything from it).
	it("given_aPanelBoundedBesideTheGrid_when_itsListIsLong_then_theListScrollsAndTheHeaderStays", async () => {
		const user = userEvent.setup();
		render(
			<RosterSidePanel
				title="Issues"
				sections={[
					{
						key: "cover",
						title: "Leave and cover",
						items: Array.from({ length: 30 }, (_, index) => ({
							key: `day-${index}`,
							title: `Person ${index}`,
							lines: ["Needs cover"],
							action: { label: `Find cover ${index}`, onClick: vi.fn() },
						})),
					},
				]}
				onClose={vi.fn()}
			/>
		);

		const panel = screen.getByRole("complementary", { name: "Issues" });
		// The heading sits with its summary line inside the header bar.
		const header = screen.getByRole("heading", {
			name: "Issues",
		}).parentElement?.parentElement;
		const list = screen
			.getByRole("heading", { name: "Leave and cover" })
			.closest("section")?.parentElement;
		expect(panel).toHaveClass("flex", "flex-col", "lg:sticky");
		expect(header).toHaveClass("shrink-0");
		expect(header).not.toHaveClass("overflow-y-auto");
		expect(list).toHaveClass("min-h-0", "flex-1", "overflow-y-auto");
		await user.tab();
		await user.tab();
		expect(screen.getByRole("button", { name: "Find cover 0" })).toHaveFocus();
		expect(
			screen.getByRole("button", { name: "Find cover 29" })
		).toBeInTheDocument();
	});
});
