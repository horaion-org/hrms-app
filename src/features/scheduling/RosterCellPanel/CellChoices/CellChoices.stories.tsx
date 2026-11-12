import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { cellChoicesFixture } from "@/features/scheduling/RosterCellPanel/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";
import { CellChoices } from "./CellChoices";

const meta = {
	title: "Features/Scheduling/RosterCellPanel/CellChoices",
	component: CellChoices,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<div className="flex max-w-96 flex-col gap-3 p-4">
					<Story />
				</div>
			</I18nextProvider>
		),
	],
	args: {
		choices: cellChoicesFixture({ chooseMode: fn() }),
		radioName: "mode",
		name: "Aisha Rahman",
		day: "Mon 12 Oct",
		dayHasShift: true,
	},
} satisfies Meta<typeof CellChoices>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A working day with nothing chosen yet. */
export const NothingChosen: Story = {};

/** Another shift chosen: pick one of the shifts open that day. */
export const AnotherShift: Story = {
	args: {
		choices: cellChoicesFixture({
			mode: "shift",
			shiftChoices: frozenShiftsFixture(),
			setShiftId: fn(),
		}),
	},
};

/** Not working chosen: pick the day's type from the schedule's, its own type first. */
export const NotWorkingWithType: Story = {
	args: {
		choices: cellChoicesFixture({
			mode: "dayOff",
			dayTypes: ["OFF", "REST"],
			dayType: "REST",
			setDayType: fn(),
		}),
	},
};

/** A day already not worked: change its type. */
export const AnotherDayType: Story = {
	args: {
		dayHasShift: false,
		choices: cellChoicesFixture({
			mode: "dayOff",
			notWorkingWording: "anotherDayType",
			dayTypes: ["OFF"],
			dayType: "OFF",
			setDayType: fn(),
		}),
	},
};

/** A part-timer's shift: removing it leaves the day absent, with no type to choose. */
export const PartTimerRemovesShift: Story = {
	args: {
		choices: cellChoicesFixture({
			mode: "dayOff",
			notWorkingWording: "removeShift",
		}),
	},
};

/** A part-timer's day to decide: they have no day off, so it confirms no shift. */
export const PartTimerDayToDecide: Story = {
	args: {
		dayHasShift: false,
		choices: cellChoicesFixture({ notWorkingWording: "confirmNoShift" }),
	},
};

/** A day to decide: the not-working choice confirms the day off. */
export const DayToDecide: Story = {
	args: {
		dayHasShift: false,
		choices: cellChoicesFixture({ notWorkingWording: "confirmDayOff" }),
	},
};
