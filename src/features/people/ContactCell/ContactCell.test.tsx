import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContactCell } from "@/features/people/ContactCell";

describe("ContactCell", () => {
	it("shows the phone number as sent above the email, each with an icon", () => {
		const { container } = render(
			<ContactCell email="moses.lee@company.com" phone="+6591234821" />
		);

		const phone = screen.getByText("+6591234821");
		const email = screen.getByText("moses.lee@company.com");
		expect(
			phone.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		const icons = container.querySelectorAll("svg");
		expect(icons).toHaveLength(2);
		for (const icon of icons)
			expect(icon).toHaveAttribute("aria-hidden", "true");
	});

	it("shows only the email when there is no phone number", () => {
		const { container } = render(
			<ContactCell email="moses.lee@company.com" phone={null} />
		);

		expect(screen.getByText("moses.lee@company.com")).toBeVisible();
		expect(container.querySelectorAll("svg")).toHaveLength(1);
	});
});
