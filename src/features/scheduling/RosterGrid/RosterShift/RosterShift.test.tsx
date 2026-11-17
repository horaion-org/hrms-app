import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { RosterShift } from "@/features/scheduling/RosterGrid";
import type { RosterShiftCell } from "@/features/scheduling/roster/roster";

const assignment: RosterShiftCell = {
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
};

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("RosterShift", () => {
	it("given_aGeneratedShift_when_rendered_then_isNamedAndColouredByItsShift", async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(
			<RosterShift
				selected
				label="Aisha Rahman, Mon 09:00 – 15:00"
				shift={assignment}
				timeRange="09:00 – 15:00"
				onSelect={onSelect}
			/>
		);

		const button = screen.getByRole("button", {
			name: "Aisha Rahman, Mon 09:00 – 15:00",
		});
		expect(button).toHaveAttribute("aria-pressed", "true");
		expect(button).toHaveTextContent(
			"09:00 – 15:00Front Desk AMFront Desk Lead"
		);
		expect(button).toHaveStyle({
			borderColor: "#E9A55A",
			backgroundColor: "rgb(252, 242, 230)",
		});
		await user.click(button);
		expect(onSelect).toHaveBeenCalled();
	});

	it("given_aStretchedShift_when_rendered_then_showsAnOvertimePillPerSide", () => {
		render(
			<RosterShift
				label="Aisha Rahman, Mon 08:00 – 17:00, Stretched 3 h into overtime"
				selected={false}
				status="Stretched 3 h into overtime"
				timeRange="08:00 – 17:00"
				shift={{
					...assignment,
					start: "08:00",
					end: "17:00",
					stretchMinutes: 180,
					stretchTimes: [
						{ start: "08:00", end: "09:00" },
						{ start: "15:00", end: "17:00" },
					],
				}}
				onSelect={vi.fn()}
			/>
		);

		expect(screen.getByText("+OT 08:00 – 09:00")).toBeInTheDocument();
		expect(screen.getByText("+OT 15:00 – 17:00")).toBeInTheDocument();
	});

	it("given_aShiftWorkedAsItIs_when_rendered_then_showsNoOvertimePill", () => {
		render(
			<RosterShift
				label="Aisha Rahman, Mon 09:00 – 15:00"
				selected={false}
				shift={assignment}
				timeRange="09:00 – 15:00"
				onSelect={vi.fn()}
			/>
		);

		expect(screen.queryByText(/\+OT/)).toBeNull();
	});

	it("given_aNarrowCell_when_rendered_then_showsTheTimeFirstAndNeverCutsItShort", () => {
		render(
			<RosterShift
				label="Aisha Rahman, Mon 09:00 – 15:00"
				selected={false}
				shift={assignment}
				timeRange="09:00 – 15:00"
				onSelect={vi.fn()}
			/>
		);

		const [time, name, role] = Array.from(screen.getByRole("button").children);
		expect(time).toHaveTextContent("09:00 – 15:00");
		expect(time).not.toHaveClass("truncate");
		expect(name).toHaveTextContent("Front Desk AM");
		expect(name).toHaveClass("truncate");
		expect(role).toHaveTextContent("Front Desk Lead");
	});

	it.each([
		["needs a look", "issue", "bg-warning-900"],
		["was changed by hand", "changed", "ring-ink-blue-700"],
	] as const)(
		"given_aDayThat%s_when_rendered_then_marksItInTheTilesCorner",
		(_, mark, looks) => {
			render(
				<RosterShift
					label="Aisha Rahman, Mon 09:00 – 15:00"
					mark={mark}
					selected={false}
					shift={assignment}
					timeRange="09:00 – 15:00"
					onSelect={vi.fn()}
				/>
			);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("relative");
			const spot = button.querySelector("[aria-hidden='true']");
			expect(spot).toHaveClass("absolute", "top-1.5", "right-1.5", looks);
		}
	);

	it("given_aRoleThatRepeatsTheJobTitle_when_rendered_then_leavesItOutAndAddsTheStatus", () => {
		render(
			<RosterShift
				label="Aisha Rahman, Mon 09:00 – 15:00, Leave requested"
				selected={false}
				shift={assignment}
				showsRole={false}
				status="Leave requested"
				timeRange="09:00 – 15:00"
				onSelect={vi.fn()}
			/>
		);

		expect(screen.getByRole("button")).toHaveTextContent(
			/^09:00 – 15:00Front Desk AMLeave requested$/
		);
		expect(
			screen.getByRole("button").querySelector("[aria-hidden]")
		).toBeNull();
	});

	it("given_aStatusLongerThanTheCell_when_rendered_then_itShowsWholeOnHover", () => {
		render(
			<RosterShift
				label="Aisha Rahman, Wed 11:00 – 15:00, Annual leave 07:00–11:00"
				selected={false}
				shift={assignment}
				status="Annual leave 07:00–11:00"
				timeRange="11:00 – 15:00"
				onSelect={vi.fn()}
			/>
		);

		expect(screen.getByText("Annual leave 07:00–11:00")).toHaveAttribute(
			"title",
			"Annual leave 07:00–11:00"
		);
	});

	it("given_anOpenPanel_when_compact_then_showsTheTimeOnlyAndKeepsTheFullLabel", () => {
		render(
			<RosterShift
				compact
				label="Aisha Rahman, Mon 09:00 – 15:00, Leave requested"
				mark="issue"
				selected={false}
				shift={assignment}
				status="Leave requested"
				timeRange="09:00 – 15:00"
				onSelect={vi.fn()}
			/>
		);

		const button = screen.getByRole("button", {
			name: "Aisha Rahman, Mon 09:00 – 15:00, Leave requested",
		});
		expect(button).toHaveTextContent(/^09:00 – 15:00$/);
		expect(button).toHaveClass("h-10");
		expect(button.querySelector("[aria-hidden='true']")).toHaveClass(
			"bg-warning-900"
		);
	});
});
