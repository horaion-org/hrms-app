import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { FindingsMarker } from "@/features/scheduling/FindingsMarker";
import { findingNames } from "@/features/scheduling/roster/findings/findingNames";
import { findingsOfEveryKindFixture } from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const findings = findingsOfEveryKindFixture();

const meta = {
	title: "Features/Scheduling/FindingsMarker",
	component: FindingsMarker,
	parameters: { layout: "centered" },
	args: {
		label: "2 notes for Ben Ong",
		names: findingNames(findings, {
			assignments: [],
			shifts: [],
			constraints: [],
		}),
		onShowAll: fn(),
		findings: [
			{ kind: "conflict", conflict: findings.conflicts[3]! },
			{
				kind: "diagnostic",
				diagnostic: findings.diagnostics.find(
					({ code }) => code === "UNASSIGNABLE_EMPLOYEE"
				)!,
			},
		],
	},
} satisfies Meta<typeof FindingsMarker>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A roster note and a setup issue on one row: marked in the roster tone with a count. */
export const RosterAndSetup: Story = {};

/** One setup issue alone: marked in the setup tone. */
export const SetupOnly: Story = {
	args: {
		label: "1 note for Ben Ong",
		findings: [
			{
				kind: "diagnostic",
				diagnostic: findings.diagnostics.find(
					({ code }) => code === "UNASSIGNABLE_EMPLOYEE"
				)!,
			},
		],
	},
};
