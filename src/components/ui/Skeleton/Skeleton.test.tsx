import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "@/components/ui/Skeleton";

describe("Skeleton", () => {
	it("given_aSize_when_rendered_then_isAHiddenPulsingPlaceholder", () => {
		const { container } = render(<Skeleton className="h-12 w-32" />);

		const placeholder = container.firstElementChild;
		expect(placeholder).toHaveAttribute("aria-hidden", "true");
		expect(placeholder).toHaveClass("animate-pulse", "h-12", "w-32");
	});
});
