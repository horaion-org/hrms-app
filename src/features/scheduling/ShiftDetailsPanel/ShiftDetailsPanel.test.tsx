import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ShiftDetailsPanel } from "@/features/scheduling/ShiftDetailsPanel";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const shift = {
	kind: "shift",
	assignmentId: "a-1",
	shiftId: "front-desk-am-copy",
	name: "Front Desk AM",
	group: "Front Desk",
	colour: "#E9A55A",
	start: "09:00",
	end: "15:00",
	unpaidBreakMinutes: 0,
	carriesOvertime: false,
	role: "Front Desk Lead",
	date: "2026-10-13",
} as const;

describe("ShiftDetailsPanel", () => {
	it("given_aWorkedDay_when_rendered_then_describesItsFrozenShiftWithoutActions", () => {
		render(
			<ShiftDetailsPanel
				shift={shift}
				staffName="Aisha Rahman"
				onClose={vi.fn()}
			/>
		);

		const panel = screen.getByRole("complementary", { name: "Shift Details" });
		expect(panel).toHaveTextContent("Aisha Rahman");
		expect(within(panel).getByText("Assigned")).toBeInTheDocument();
		expect(panel).toHaveTextContent("DateTue, Oct 13, 2026");
		expect(panel).toHaveTextContent("Time09:00 – 15:00");
		expect(panel).toHaveTextContent("ShiftFront Desk AM");
		expect(panel).toHaveTextContent("GroupFront Desk");
		expect(panel).toHaveTextContent("RoleFront Desk Lead");
		expect(within(panel).getAllByRole("button")).toHaveLength(1);
	});

	it("given_close_when_clicked_then_reportsIt", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(
			<ShiftDetailsPanel
				shift={shift}
				staffName="Aisha Rahman"
				onClose={onClose}
			/>
		);

		await user.click(
			screen.getByRole("button", { name: "Close shift details" })
		);
		expect(onClose).toHaveBeenCalled();
	});
});
