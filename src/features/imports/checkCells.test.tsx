import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	flaggedValueCell,
	problemsCell,
	type CheckProblem,
} from "@/features/imports/checkCells";

const emailError: CheckProblem = {
	code: "EMAIL_INVALID",
	column: "EMAIL",
	severity: "ERROR",
};
const nameNotice: CheckProblem = {
	code: "NAME_TRIMMED",
	column: "NAME",
	severity: "NOTICE",
};

describe("flaggedValueCell", () => {
	it("outlines a value an error is about, and only that one", () => {
		const row = {
			values: { EMAIL: "not-an-email", NAME: " Aisha " },
			problems: [emailError, nameNotice],
		};
		render(
			<>
				{flaggedValueCell(row, "EMAIL")}
				{flaggedValueCell(row, "NAME")}
				{flaggedValueCell(row, "BRANCH")}
			</>
		);

		expect(screen.getByText("not-an-email")).toHaveAttribute("data-flagged");
		expect(screen.getByText("Aisha")).not.toHaveAttribute("data-flagged");
	});
});

describe("problemsCell", () => {
	it("words each problem and draws errors in red", () => {
		render(
			<>{problemsCell([emailError, nameNotice], (p) => p.code, "None")}</>
		);

		expect(screen.getByText("EMAIL_INVALID")).toHaveClass("text-error-700");
		expect(screen.getByText("NAME_TRIMMED")).not.toHaveClass("text-error-700");
	});

	it("says there is no problem when the row has none", () => {
		render(<>{problemsCell<CheckProblem>([], (p) => p.code, "No problem")}</>);

		expect(screen.getByText("No problem")).toBeInTheDocument();
	});
});
