import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Avatar, initialsOf } from "@/components/ui/Avatar";

describe("Avatar", () => {
	it.each([
		{ name: "John Doe", initials: "JD" },
		{ name: "Jane Mary Tan", initials: "JT" },
		{ name: "aisha", initials: "A" },
		{ name: "  Faris   Ahmad  ", initials: "FA" },
		{ name: "Émile Zola", initials: "ÉZ" },
		{ name: "", initials: "" },
	])("shows $initials for $name", ({ name, initials }) => {
		expect(initialsOf(name)).toBe(initials);
	});

	it("announces the full name as an image and hides the initials", () => {
		render(<Avatar name="John Doe" />);

		const avatar = screen.getByRole("img", { name: "John Doe" });
		expect(avatar).toHaveAttribute("title", "John Doe");
		expect(avatar.textContent).toBe("JD");
		expect(avatar.firstElementChild).toHaveAttribute("aria-hidden", "true");
	});

	it("draws the design's filled Ink Blue circle", () => {
		render(<Avatar name="John Doe" />);

		expect(screen.getByRole("img", { name: "John Doe" })).toHaveClass(
			"size-12",
			"rounded-full",
			"bg-ink-blue-500",
			"text-white"
		);
	});

	it("merges caller classes and passes span attributes and ref through", () => {
		const ref = createRef<HTMLSpanElement>();
		render(
			<Avatar ref={ref} className="ml-2" data-person="jd" name="John Doe" />
		);

		const avatar = screen.getByRole("img", { name: "John Doe" });
		expect(avatar).toHaveClass("ml-2", "bg-ink-blue-500");
		expect(avatar).toHaveAttribute("data-person", "jd");
		expect(ref.current).toBe(avatar);
	});
});
