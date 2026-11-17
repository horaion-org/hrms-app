import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	ListProblem,
	type ListProblemProps,
} from "@/features/organisation/ListProblem";

const renderProblem = (problem: ListProblemProps["problem"]): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<ListProblem problem={problem} />
		</I18nextProvider>
	);
};

describe("ListProblem", () => {
	it("says why the list failed and reads it again on Try again", async () => {
		const retry = vi.fn();
		renderProblem({ message: "Access is still being updated.", alert: true, retry });

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Access is still being updated."
		);
		await userEvent.click(screen.getByRole("button", { name: "Try again" }));
		expect(retry).toHaveBeenCalledOnce();
	});

	it("offers no Try again where reading again cannot help", () => {
		renderProblem({ message: "You don’t have permission.", alert: false });

		expect(screen.getByText("You don’t have permission.")).toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
