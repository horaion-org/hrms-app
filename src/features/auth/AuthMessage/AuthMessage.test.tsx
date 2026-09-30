import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthMessage } from "@/features/auth/AuthMessage";
import * as stories from "@/features/auth/AuthMessage/AuthMessage.stories";

describe("AuthMessage", () => {
	it("announces an error and keeps Onboarding's error treatment", () => {
		render(<AuthMessage kind="error">Please try again.</AuthMessage>);

		expect(screen.getByRole("alert")).toHaveTextContent("Please try again.");
		expect(screen.getByRole("alert")).toHaveClass(
			"rounded-lg",
			"border",
			"border-error-200",
			"bg-error-50",
			"p-3",
			"text-sm",
			"text-error-900"
		);
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});

	it("announces a status with a success treatment and preserves child markup", () => {
		render(
			<AuthMessage kind="status">
				Check <strong>your email</strong> to continue.
			</AuthMessage>
		);

		expect(screen.getByRole("status")).toHaveTextContent(
			"Check your email to continue."
		);
		expect(screen.getByRole("status")).toHaveClass(
			"border-success-200",
			"bg-success-50",
			"text-success-900"
		);
		expect(screen.getByRole("status")).toContainElement(
			screen.getByText("your email")
		);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});

describe("AuthMessage stories", () => {
	const { Error, Status } = composeStories(stories);

	it("renders the error story as an alert", () => {
		render(<Error />);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Something went wrong. Please try again."
		);
	});

	it("renders the status story as a status", () => {
		render(<Status />);
		expect(screen.getByRole("status")).toHaveTextContent(
			"Check your email to continue."
		);
	});
});
