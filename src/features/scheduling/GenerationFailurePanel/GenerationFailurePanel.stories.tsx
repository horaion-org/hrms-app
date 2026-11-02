import type { Meta, StoryObj } from "@storybook/react-vite";
import { GenerationFailurePanel } from "@/features/scheduling/GenerationFailurePanel";
import {
	generationFindingsFixture,
	generationFixture,
} from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/GenerationFailurePanel",
	component: GenerationFailurePanel,
	parameters: { layout: "padded" },
	args: {
		generation: generationFixture({
			status: "FAILED",
			errorCode: "snapshot_invalid",
			findings: null,
		}),
	},
} satisfies Meta<typeof GenerationFailurePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FailedRun: Story = {};

/** The engine ran but no roster met every rule. */
export const Infeasible: Story = {
	args: {
		generation: generationFixture({
			engineOutcome: "INFEASIBLE",
			findings: generationFindingsFixture({
				scheduleStatus: "INFEASIBLE",
				failureReason: "No roster satisfies the staffing rules",
			}),
		}),
	},
};
