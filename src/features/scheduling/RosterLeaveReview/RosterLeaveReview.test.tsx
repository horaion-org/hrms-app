import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { RosterLeaveReview } from "./RosterLeaveReview";

describe("RosterLeaveReview", () => {
	it("shows the move, what to know and a required remark", async () => {
		const onRemarkChange = vi.fn();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<RosterLeaveReview
					change={{ before: "Morning", after: "Sick leave" }}
					name="Aisha"
					notes={["It will need cover."]}
					remark=""
					onRemarkChange={onRemarkChange}
				/>
			</I18nextProvider>
		);

		expect(screen.getByText("Morning → Sick leave")).toBeInTheDocument();
		expect(screen.getByText("It will need cover.")).toBeInTheDocument();
		const remark = screen.getByRole("textbox");
		expect(remark).toHaveAttribute("aria-required", "true");
		await userEvent.type(remark, "A");
		expect(onRemarkChange).toHaveBeenCalledWith("A");
	});
});
