import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthLayout } from "@/components/layout/AuthLayout";

beforeEach(() => {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: false,
		media: query,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		onchange: null,
		dispatchEvent: vi.fn(),
	}));
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe("AuthLayout", () => {
	it("given_children_when_theLayoutRenders_then_showsThem", () => {
		render(<AuthLayout>the page form</AuthLayout>);

		expect(screen.getByText("the page form")).toBeInTheDocument();
	});

	it("given_theLayout_when_rendered_then_showsTheBrandHeadlineAndSubtext", () => {
		render(<AuthLayout>form</AuthLayout>);

		expect(screen.getByText(/smarter scheduling/i)).toBeInTheDocument();
		expect(screen.getByText(/plan shifts/i)).toBeInTheDocument();
	});

	it("given_theLayout_when_rendered_then_theBrandPanelIsHiddenBelowLg", () => {
		render(<AuthLayout>form</AuthLayout>);

		const panel = screen.getByRole("complementary");
		expect(panel.className).toContain("hidden");
		expect(panel.className).toContain("lg:flex");
	});

	it("given_theLayout_when_rendered_then_theWordmarkHasAnAccessibleName", () => {
		render(<AuthLayout>form</AuthLayout>);

		expect(
			screen.getByRole("img", { name: "Active Workforce" })
		).toBeInTheDocument();
	});

	it("given_theLayout_when_rendered_then_theMiddleSlideIsCurrentAsInTheDesign", () => {
		render(<AuthLayout>form</AuthLayout>);

		expect(
			screen.getAllByRole("button", { name: /go to slide/i })
		).toHaveLength(3);
		expect(
			screen.getByRole("button", { name: "Go to slide 2" })
		).toHaveAttribute("aria-current", "true");
	});

	it("given_theLayout_when_rendered_then_theQueueShowsThePreviousAndNextSlides", () => {
		const { container } = render(<AuthLayout>form</AuthLayout>);

		const images = container.querySelectorAll("img");
		expect(images).toHaveLength(3);
		expect(images[0]?.className).toContain("opacity-60");
		expect(images[1]?.className).toContain("opacity-100");
		expect(images[2]?.className).toContain("opacity-60");
	});

	it("given_theSlider_when_timePasses_then_theQueueRotates", () => {
		vi.useFakeTimers();
		const { container } = render(<AuthLayout>form</AuthLayout>);

		act(() => {
			vi.advanceTimersByTime(5000);
		});

		const images = container.querySelectorAll("img");
		expect(images[2]?.className).toContain("opacity-100");
		expect(images[1]?.className).toContain("opacity-60");
		expect(images[0]?.className).toContain("opacity-60");
	});

	it("given_theSlider_when_itAdvances_then_theWordmarkImageKeepsItsAccessibleName", () => {
		vi.useFakeTimers();
		render(<AuthLayout>form</AuthLayout>);

		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(
			screen.getByRole("img", { name: "Active Workforce" })
		).toHaveAttribute("src", expect.stringContaining("auth-slide-2.png"));
	});

	it("given_aDot_when_clicked_then_thatSlideBecomesCurrent", () => {
		render(<AuthLayout>form</AuthLayout>);

		fireEvent.click(screen.getByRole("button", { name: "Go to slide 3" }));

		expect(
			screen.getByRole("button", { name: "Go to slide 3" })
		).toHaveAttribute("aria-current", "true");
		expect(
			screen.getByRole("button", { name: "Go to slide 2" })
		).toHaveAttribute("aria-current", "false");
	});

	it("given_theSlider_when_timePasses_then_itAdvances", () => {
		vi.useFakeTimers();
		render(<AuthLayout>form</AuthLayout>);

		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(
			screen.getByRole("button", { name: "Go to slide 3" })
		).toHaveAttribute("aria-current", "true");
	});

	it("given_thePanelIsHovered_when_timePasses_then_theSliderHolds", () => {
		vi.useFakeTimers();
		render(<AuthLayout>form</AuthLayout>);

		fireEvent.mouseEnter(screen.getByRole("complementary"));
		act(() => {
			vi.advanceTimersByTime(10000);
		});

		expect(
			screen.getByRole("button", { name: "Go to slide 2" })
		).toHaveAttribute("aria-current", "true");
	});

	it("given_reducedMotion_when_timePasses_then_theSliderHolds", () => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: true,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			onchange: null,
			dispatchEvent: vi.fn(),
		}));
		vi.useFakeTimers();
		render(<AuthLayout>form</AuthLayout>);

		act(() => {
			vi.advanceTimersByTime(15000);
		});

		expect(
			screen.getByRole("button", { name: "Go to slide 2" })
		).toHaveAttribute("aria-current", "true");
	});
});
