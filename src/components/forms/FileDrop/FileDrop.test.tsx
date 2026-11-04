import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FileDrop } from "@/components/forms/FileDrop";

const props = {
	prompt: "Drop your file here, or",
	chooseLabel: "choose a file",
	hint: ".xlsx or .csv",
	accept: [".xlsx", ".csv"],
};

describe("FileDrop", () => {
	it("hands over a file chosen with the picker, which offers only the accepted types", async () => {
		const onFileChange = vi.fn();
		render(<FileDrop {...props} onFileChange={onFileChange} />);
		const input = screen.getByLabelText(/choose a file/);
		const file = new File(["Name"], "people.csv", { type: "text/csv" });

		await userEvent.upload(input, file);

		expect(input).toHaveAttribute("accept", ".xlsx,.csv");
		expect(input).toHaveAccessibleDescription(".xlsx or .csv");
		expect(onFileChange).toHaveBeenCalledWith(file);
	});

	it("hands over a dropped file", () => {
		const onFileChange = vi.fn();
		render(<FileDrop {...props} onFileChange={onFileChange} />);
		const file = new File(["Name"], "people.xlsx");

		fireEvent.drop(
			screen.getByText(/Drop your file here/).closest("label") ?? document.body,
			{
				dataTransfer: { files: [file] },
			}
		);

		expect(onFileChange).toHaveBeenCalledWith(file);
	});

	it("ignores a drop while disabled", () => {
		const onFileChange = vi.fn();
		render(<FileDrop {...props} disabled onFileChange={onFileChange} />);

		fireEvent.drop(
			screen.getByText(/Drop your file here/).closest("label") ?? document.body,
			{
				dataTransfer: { files: [new File(["Name"], "people.csv")] },
			}
		);

		expect(onFileChange).not.toHaveBeenCalled();
	});
});
