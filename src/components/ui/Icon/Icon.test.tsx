import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Heroicon } from "@/common/types";
import * as icons from "@/components/ui/Icon";
import catalogue from "@/components/ui/Icon/generator/catalogue.json";
import manifest from "@/components/ui/Icon/generator/manifest.json";

const exportsByName: Record<string, Heroicon | undefined> = icons;
// Derived from the manifest independently, so a generator that drops or
// misnames an icon can't agree with its own catalogue and pass.
const expectedCatalogue = manifest.map((group) =>
	group.map((name) => ({
		name,
		exportName: `${name
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join("")}Icon`,
	}))
);
const entries = expectedCatalogue.flat();

describe("Horaion icons", () => {
	it.each(entries)(
		"$name forwards SVG props, refs and an explicit title id",
		({ exportName }) => {
			const Icon = exportsByName[exportName];
			if (!Icon) throw new Error(`Missing ${exportName}`);
			const ref = createRef<SVGSVGElement>();
			const onClick = vi.fn();
			render(
				<Icon
					ref={ref}
					className="size-5 text-ink-blue-900"
					data-testid="icon"
					id="leave-icon"
					title="Leave"
					titleId="leave-title"
					onClick={onClick}
				/>
			);
			const svg = screen.getByRole("img", { name: "Leave" });
			expect(svg).toBe(screen.getByTestId("icon"));
			expect(svg).toHaveClass("size-5", "text-ink-blue-900");
			expect(svg).toHaveAttribute("id", "leave-icon");
			expect(svg).toHaveAttribute("aria-labelledby", "leave-title");
			expect(svg.querySelector("title")).toHaveAttribute("id", "leave-title");
			expect(svg).not.toHaveAttribute("titleId");
			expect(ref.current).toBe(svg);
			svg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			expect(onClick).toHaveBeenCalledOnce();
		}
	);

	it("gives repeated icons distinct, stable accessible names", () => {
		const { rerender } = render(
			<>
				<icons.LeaveIcon title="Annual leave" />
				<icons.LeaveIcon title="Sick leave" />
			</>
		);
		const firstId = screen
			.getByRole("img", { name: "Annual leave" })
			.getAttribute("aria-labelledby");
		const secondId = screen
			.getByRole("img", { name: "Sick leave" })
			.getAttribute("aria-labelledby");
		expect(firstId).not.toBe(secondId);
		rerender(
			<>
				<icons.LeaveIcon title="Updated leave" />
				<icons.LeaveIcon title="Sick leave" />
			</>
		);
		expect(screen.getByRole("img", { name: "Updated leave" })).toHaveAttribute(
			"aria-labelledby",
			firstId
		);
	});

	it.each(entries)(
		"$name is decorative until given a title",
		({ exportName }) => {
			const Icon = exportsByName[exportName];
			if (!Icon) throw new Error(`Missing ${exportName}`);
			const { container, rerender } = render(<Icon />);
			expect(container.querySelector("svg")).toHaveAttribute(
				"aria-hidden",
				"true"
			);
			expect(screen.queryByRole("img")).not.toBeInTheDocument();
			rerender(<Icon title="Request leave" />);
			const svg = screen.getByRole("img", { name: "Request leave" });
			expect(svg).not.toHaveAttribute("aria-hidden", "true");
			const title = svg.querySelector("title");
			expect(title).toHaveTextContent("Request leave");
			expect(title?.id).toBeTruthy();
			expect(svg).toHaveAttribute("aria-labelledby", title?.id);
		}
	);

	it("exports exactly the manifest's icons, as catalogued", () => {
		expect(catalogue).toEqual(expectedCatalogue);
		expect(Object.keys(icons).sort()).toEqual(
			entries.map(({ exportName }) => exportName).sort()
		);
	});

	it.each(entries)(
		"$name renders scalable, text-coloured geometry",
		({ exportName }) => {
			const Icon = exportsByName[exportName];
			expect(Icon).toBeDefined();
			if (!Icon) throw new Error(`Missing ${exportName}`);
			const { container } = render(<Icon />);
			const svg = container.querySelector("svg");
			expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
			expect(svg).not.toHaveAttribute("width");
			expect(svg).not.toHaveAttribute("height");
			expect(svg?.querySelectorAll("path, circle").length).toBeGreaterThan(0);
			for (const element of container.querySelectorAll("[fill], [stroke]")) {
				for (const attribute of ["fill", "stroke"]) {
					if (element.hasAttribute(attribute)) {
						expect(["currentColor", "none"]).toContain(
							element.getAttribute(attribute)
						);
					}
				}
			}
		}
	);
});
