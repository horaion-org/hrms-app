import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { RosterGrid } from "@/features/scheduling/RosterGrid";
import { daysOf, type RosterGroup } from "@/features/scheduling/schedules";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const days = daysOf("2026-04-13");

const groups: Array<RosterGroup> = [
	{
		groupId: "front-office",
		name: "Front Office",
		headcount: 1,
		staff: [
			{
				staffId: "john-lim",
				name: "John Lim",
				jobTitle: "Front Office Manager",
				shifts: [
					{
						shiftId: "a",
						date: "2026-04-13",
						start: "09:00",
						end: "18:00",
						role: "Front Desk",
						kind: "full",
						breakMinutes: 60,
						location: "Main Branch",
					},
					{
						shiftId: "b",
						date: "2026-04-15",
						start: "09:00",
						end: "13:00",
						role: "Front Desk",
						kind: "half",
						breakMinutes: 0,
						location: "Main Branch",
					},
					{
						shiftId: "next-week",
						date: "2026-04-20",
						start: "09:00",
						end: "18:00",
						role: "Front Desk",
						kind: "full",
						breakMinutes: 60,
						location: "Main Branch",
					},
				],
			},
		],
	},
	{ groupId: "kitchen", name: "Kitchen", headcount: 5, staff: [] },
];

describe("RosterGrid", () => {
	it("given_aWeek_when_rendered_then_showsEachDayAsAShiftOrOff", () => {
		render(<RosterGrid days={days} groups={groups} onShiftSelect={vi.fn()} />);

		const row = screen.getByRole("row", { name: /John Lim/ });
		expect(within(row).getAllByRole("button")).toHaveLength(2);
		expect(within(row).getAllByText("OFF")).toHaveLength(5);
		expect(row).toHaveTextContent("12 hrs");
		expect(screen.getAllByRole("columnheader")).toHaveLength(8);
	});

	it("given_aShift_when_chosen_then_reportsThePersonAndShift", async () => {
		const user = userEvent.setup();
		const onShiftSelect = vi.fn();
		render(
			<RosterGrid days={days} groups={groups} onShiftSelect={onShiftSelect} />
		);

		await user.click(screen.getByRole("button", { name: /John Lim, Mon/ }));

		expect(onShiftSelect).toHaveBeenCalledWith(
			expect.objectContaining({ staffId: "john-lim" }),
			expect.objectContaining({ shiftId: "a" })
		);
	});

	it("given_groups_when_toggled_then_foldAndUnfold", async () => {
		const user = userEvent.setup();
		render(<RosterGrid days={days} groups={groups} onShiftSelect={vi.fn()} />);

		await user.click(
			screen.getByRole("button", { name: "Collapse Front Office" })
		);
		expect(screen.queryByRole("row", { name: /John Lim/ })).toBeNull();

		await user.click(screen.getByRole("button", { name: "Expand Kitchen" }));
		expect(
			screen.getByText("No one is listed in this group.")
		).toBeInTheDocument();
	});
});
