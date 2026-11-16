import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
	SHIFT_FIXTURES,
	departmentShiftFixture,
} from "@/features/scheduling/shifts/fixtures";
import { ShiftTable } from "@/features/scheduling/shifts/ShiftTable";
import { rememberClosed } from "@/features/scheduling/sectionFolds";
import "@/common/i18n";

const shifts = SHIFT_FIXTURES.map((shift, index) => ({
	...departmentShiftFixture(shift),
	...(index % 2 === 1 && { departmentId: "d-2", departmentName: "Bar" }),
}));

const meta = {
	title: "Features/Scheduling/Shifts/ShiftTable",
	component: ShiftTable,
	parameters: { layout: "padded" },
	args: { shifts, onEdit: fn(), onDelete: fn() },
} satisfies Meta<typeof ShiftTable>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One department chosen: its shifts, without Branch or Department columns. */
export const OneDepartment: Story = {};

/** Every department in reach: each row names its Branch and Department under its name. */
export const AcrossDepartments: Story = {
	args: { showBranch: true, showDepartment: true },
};

/** With what the staffing constraints ask of each shift, and one that too few people can meet. */
export const WithNeeds: Story = {
	args: {
		showDepartment: true,
		needs: {
			byShift: new Map([
				[
					"front-desk-am",
					[
						{
							constraintId: "desk-cover",
							name: "Desk cover",
							departmentId: "d-1",
							comparison: "AT_LEAST",
							headcount: 2,
							jobTitleNames: ["Front Desk Staff", "Front Desk Lead"],
							onDuty: false,
							ifPossible: false,
						},
					],
				],
				[
					"overnight-ops",
					[
						{
							constraintId: "night-audit",
							name: "Night audit",
							departmentId: "d-1",
							comparison: "AT_LEAST",
							headcount: 3,
							jobTitleNames: ["Night Auditor"],
							onDuty: false,
							ifPossible: false,
						},
					],
				],
			]),
			capacityOf: (need) =>
				need.constraintId === "night-audit"
					? {
							headcount: 3,
							peopleWithTitles: 2,
							jobTitleNames: ["Night Auditor"],
						}
					: undefined,
		},
	},
};

/** Bar's rows offer Delete only: the person holds the delete key there but not the update key. */
export const DeleteOnlyInBar: Story = {
	args: {
		showDepartment: true,
		canEdit: (shift) => shift.departmentName !== "Bar",
	},
};

/** The browser-storage key ShiftTable remembers its folded groups under. */
const CLOSED_GROUPS_KEY = "horaion.shiftGroupsClosed";

/** Ticking shifts, as in a wizard, with Service folded: its heading says its hours and "2 of 3 chosen". */
export const FoldedGroupWhileChoosing: Story = {
	args: {
		selection: {
			selectedIds: SHIFT_FIXTURES.filter((shift) => shift.group === "Service")
				.slice(0, 2)
				.map((shift) => shift.shiftId),
			onChange: fn(),
		},
	},
	beforeEach: (): (() => void) => {
		rememberClosed(CLOSED_GROUPS_KEY, ["Service"]);
		// The other stories start with every group open.
		return (): void => {
			rememberClosed(CLOSED_GROUPS_KEY, []);
		};
	},
};

export const Empty: Story = { args: { shifts: [] } };
