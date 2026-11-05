import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { LockIcon } from "@/components/ui/LockIcon";

describe("LockIcon", () => {
	it("is decorative without a title", () => {
		const { container } = render(<LockIcon />);

		expect(container.querySelector("svg")).toHaveAttribute(
			"aria-hidden",
			"true"
		);
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});

	it("is an image named by its title, and forwards props and refs", () => {
		const ref = createRef<SVGSVGElement>();
		render(
			<LockIcon
				ref={ref}
				className="size-4"
				title="Set by company"
				titleId="lock-title"
			/>
		);

		const icon = screen.getByRole("img", { name: "Set by company" });
		expect(icon).toHaveAttribute("aria-labelledby", "lock-title");
		expect(icon).toHaveClass("size-4");
		expect(ref.current).toBe(icon);
	});
});
