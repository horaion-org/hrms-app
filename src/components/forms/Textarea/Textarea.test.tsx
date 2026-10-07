import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { Textarea } from "@/components/forms/Textarea";

it("supports multiline form input and exposes validation state", async () => {
	render(
		<form aria-label="Reason">
			<Textarea required aria-label="Reason" name="reason" status="error" />
		</form>
	);
	const field = screen.getByRole("textbox", { name: "Reason" });
	expect(field).toHaveAttribute("aria-invalid", "true");
	expect(field).toBeInvalid();
	await userEvent.type(field, "Team event{Enter}Coverage needed");
	expect(new FormData(screen.getByRole("form")).get("reason")).toBe(
		"Team event\nCoverage needed"
	);
});
