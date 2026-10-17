import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import type { RosterShift } from "@/features/scheduling/schedules";
import { ShiftDetailsPanel } from "@/features/scheduling/ShiftDetailsPanel";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const shift: RosterShift = {
	shiftId: "s-1",
	date: "2026-04-16",
	start: "09:00",
	end: "18:00",
	role: "Front Desk",
	kind: "full",
	breakMinutes: 60,
	location: "Main Branch",
	notes: "Swapped with Wednesday.",
};

describe("ShiftDetailsPanel", () => {
	it("offers only the actions supplied by workspace gates", () => {
		render(
			<ShiftDetailsPanel
				editable
				shift={shift}
				staffName="John Lim"
				onClose={vi.fn()}
				onEdit={vi.fn()}
			/>
		);
		expect(screen.getByRole("button", { name: "Edit Shift" })).toBeEnabled();
		expect(screen.queryByRole("button", { name: "Reassign Shift" })).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Duplicate Shift" })
		).toBeNull();
		expect(screen.queryByRole("button", { name: "Delete Shift" })).toBeNull();
	});
	it("given_aShift_when_rendered_then_describesIt", () => {
		render(
			<ShiftDetailsPanel
				editable
				shift={shift}
				staffName="John Lim"
				onClose={vi.fn()}
				onDelete={vi.fn()}
				onDuplicate={vi.fn()}
				onEdit={vi.fn()}
				onReassign={vi.fn()}
			/>
		);

		const panel = screen.getByRole("complementary", { name: "Shift Details" });
		expect(within(panel).getByText("Assigned")).toBeInTheDocument();
		expect(panel).toHaveTextContent("Thu, Apr 16, 2026");
		expect(panel).toHaveTextContent("09:00 – 18:00");
		expect(panel).toHaveTextContent("60 minutes");
		expect(panel).toHaveTextContent("Swapped with Wednesday.");
		expect(
			within(panel).getByRole("button", { name: "Edit Shift" })
		).toBeEnabled();
	});

	it("given_deleteAndClose_when_clicked_then_reportsThem", async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();
		const onClose = vi.fn();
		const onEdit = vi.fn();
		const onReassign = vi.fn();
		const onDuplicate = vi.fn();
		render(
			<ShiftDetailsPanel
				editable
				shift={shift}
				staffName="John Lim"
				onClose={onClose}
				onDelete={onDelete}
				onDuplicate={onDuplicate}
				onEdit={onEdit}
				onReassign={onReassign}
			/>
		);

		await user.click(screen.getByRole("button", { name: "Edit Shift" }));
		await user.click(screen.getByRole("button", { name: "Reassign Shift" }));
		await user.click(screen.getByRole("button", { name: "Duplicate Shift" }));
		expect(onEdit).toHaveBeenCalledOnce();
		expect(onReassign).toHaveBeenCalledOnce();
		expect(onDuplicate).toHaveBeenCalledOnce();
		await user.click(screen.getByRole("button", { name: "Delete Shift" }));
		await user.click(
			screen.getByRole("button", { name: "Close shift details" })
		);

		expect(onDelete).toHaveBeenCalledWith(shift);
		expect(onClose).toHaveBeenCalled();
	});

	it("given_aReadOnlySchedule_when_rendered_then_offersNoActions", () => {
		render(
			<ShiftDetailsPanel
				editable={false}
				shift={{ ...shift, kind: "open" }}
				staffName="John Lim"
				onClose={vi.fn()}
				onDelete={vi.fn()}
				onDuplicate={vi.fn()}
				onEdit={vi.fn()}
				onReassign={vi.fn()}
			/>
		);

		expect(screen.getByText("Open Shift")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Delete Shift" })).toBeNull();
	});
});
