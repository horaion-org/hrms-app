import { act, fireEvent, render, screen } from "@testing-library/react";
import { composeStories } from "@storybook/react-vite";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import en from "@/assets/locales/en/translations.json";
import { AuthLayout } from "@/components/layout/AuthLayout";
import * as stories from "@/components/layout/AuthLayout/AuthLayout.stories";

const i18n = createInstance();
beforeAll(async () => {
	await i18n.use(initReactI18next).init({
		lng: "en",
		resources: { en: { translation: en } },
	});
});

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
		render(<AuthLayout title="Log in">the page form</AuthLayout>);

		expect(screen.getByText("the page form")).toBeInTheDocument();
	});

	it("given_theLayout_when_rendered_then_showsTheBrandHeadlineAndSubtext", () => {
		render(<AuthLayout title="Log in">form</AuthLayout>);

		expect(screen.getByText(/smarter scheduling/i)).toBeInTheDocument();
		expect(screen.getByText(/plan shifts/i)).toBeInTheDocument();
	});

	it("given_theLayout_when_rendered_then_theBrandPanelIsHiddenBelowLg", () => {
		render(<AuthLayout title="Log in">form</AuthLayout>);

		const panel = screen.getByRole("complementary");
		expect(panel.className).toContain("hidden");
		expect(panel.className).toContain("lg:flex");
	});

	it("given_theLayout_when_rendered_then_theWordmarkHasAnAccessibleName", () => {
		render(<AuthLayout title="Log in">form</AuthLayout>);

		expect(
			screen.getByRole("img", { name: "Active Workforce" })
		).toBeInTheDocument();
	});

	it("given_theLayout_when_rendered_then_theMiddleSlideIsCurrentAsInTheDesign", () => {
		render(<AuthLayout title="Log in">form</AuthLayout>);

		expect(
			screen.getAllByRole("button", { name: /go to slide/i })
		).toHaveLength(3);
		expect(
			screen.getByRole("button", { name: "Go to slide 2" })
		).toHaveAttribute("aria-current", "true");
	});

	it("given_theLayout_when_rendered_then_theQueueShowsThePreviousAndNextSlides", () => {
		const { container } = render(<AuthLayout title="Log in">form</AuthLayout>);

		const images = container.querySelectorAll("img");
		expect(images).toHaveLength(3);
		expect(images[0]?.className).toContain("opacity-60");
		expect(images[1]?.className).toContain("opacity-100");
		expect(images[2]?.className).toContain("opacity-60");
	});

	it("given_theSlider_when_timePasses_then_theQueueRotates", () => {
		vi.useFakeTimers();
		const { container } = render(<AuthLayout title="Log in">form</AuthLayout>);

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
		render(<AuthLayout title="Log in">form</AuthLayout>);

		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(
			screen.getByRole("img", { name: "Active Workforce" })
		).toHaveAttribute("src", expect.stringContaining("auth-slide-2.png"));
	});

	it("given_aDot_when_clicked_then_thatSlideBecomesCurrent", () => {
		render(<AuthLayout title="Log in">form</AuthLayout>);

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
		render(<AuthLayout title="Log in">form</AuthLayout>);

		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(
			screen.getByRole("button", { name: "Go to slide 3" })
		).toHaveAttribute("aria-current", "true");
	});

	it("given_thePanelIsHovered_when_timePasses_then_theSliderHolds", () => {
		vi.useFakeTimers();
		render(<AuthLayout title="Log in">form</AuthLayout>);

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
		render(<AuthLayout title="Log in">form</AuthLayout>);

		act(() => {
			vi.advanceTimersByTime(15000);
		});

		expect(
			screen.getByRole("button", { name: "Go to slide 2" })
		).toHaveAttribute("aria-current", "true");
	});
});

describe("AuthLayout stories", () => {
	const { Default } = composeStories(stories);

	it("renders the page content beside the brand panel", () => {
		render(<Default />);

		expect(
			screen.getByRole("heading", { name: "Page title" })
		).toBeInTheDocument();
		expect(screen.getByRole("complementary")).toBeInTheDocument();
	});
});
