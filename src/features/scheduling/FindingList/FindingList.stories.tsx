import type { Meta, StoryObj } from "@storybook/react-vite";
import { FindingList } from "@/features/scheduling/FindingList";
import { findingNames } from "@/features/scheduling/roster/findings/findingNames";
import {
	findingsOfEveryKindFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const findings = findingsOfEveryKindFixture();

const meta = {
	title: "Features/Scheduling/FindingList",
	component: FindingList,
	parameters: { layout: "padded" },
	args: {
		showDates: true,
		names: findingNames(findings, {
			assignments: scheduleAssignmentsFixture(),
			shifts: [],
			constraints: [],
		}),
		findings: [
			{ kind: "conflict", conflict: findings.conflicts[0]! },
			{
				kind: "message",
				date: null,
				message: findings.errors[0]!.messages[0]!,
			},
			{ kind: "diagnostic", diagnostic: findings.diagnostics[0]! },
		],
	},
} satisfies Meta<typeof FindingList>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A conflict, an error and a setup issue, each with its day. */
export const Default: Story = {};
