import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { PersonCell } from "@/features/people/PersonCell";

describe("PersonCell", () => {
	it("shows the name above the employee ID beside the person's initials", () => {
		render(<PersonCell employeeCode="EMP-10482" name="Moses Lee" />);

		expect(screen.getByText("Moses Lee")).toBeVisible();
		expect(screen.getByText("EMP-10482")).toBeVisible();
		expect(screen.getByText("ML")).toBeVisible();
	});

	it("keeps the avatar out of the accessible name, since the name is beside it", () => {
		const { container } = render(
			<PersonCell employeeCode="EMP-10482" name="Moses Lee" />
		);

		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		expect(container.querySelector("[role='img']")).toHaveAttribute(
			"aria-hidden",
			"true"
		);
	});

	it("links the name to the person's profile when told who they are", async () => {
		render(
			<MemoryRouterHarness>
				<PersonCell
					employeeCode="EMP-10482"
					membershipId="m-1"
					name="Moses Lee"
				/>
			</MemoryRouterHarness>
		);

		expect(
			await screen.findByRole("link", { name: "Moses Lee" })
		).toHaveAttribute("href", "/people/m-1");
	});
});
