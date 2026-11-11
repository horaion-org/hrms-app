import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { authTestI18n } from "@/features/auth/testingI18n";
import { ReadinessGateCallout } from "@/features/scheduling/readiness/ReadinessGateCallout";

const meta = {
	title: "Features/Scheduling/ReadinessGateCallout",
	component: ReadinessGateCallout,
	parameters: { layout: "padded" },
	args: {
		className: "max-w-xl",
		gate: {
			messageKey: "scheduling.gate.nothing",
			linkTo: "shifts",
			linkKey: "scheduling.gate.setUp",
			nextNoteKey: "scheduling.gate.nothingNote",
			department: "Kitchen",
		},
		link: {
			to: "/scheduling",
			search: {
				view: "shifts",
				branch: "b-1",
				department: "d-1",
				next: "create",
				week: "2026-11-16",
			},
		},
	},
	decorators: [
		withMemoryRouter,
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof ReadinessGateCallout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NothingSetUp: Story = {};

export const NoStaffing: Story = {
	args: {
		gate: {
			messageKey: "scheduling.gate.noStaffing",
			linkTo: "constraints",
			linkKey: "scheduling.gate.addStaffing",
			nextNoteKey: "scheduling.gate.noStaffingNote",
			department: "Kitchen",
		},
		link: {
			to: "/scheduling",
			search: {
				view: "constraints",
				branch: "b-1",
				department: "d-1",
				next: "create",
				week: "2026-11-16",
			},
		},
	},
};

export const CannotFix: Story = {
	args: {
		gate: {
			messageKey: "scheduling.gate.cannotFixStaffing",
			linkTo: "constraints",
			linkKey: "scheduling.gate.viewConstraints",
			nextNoteKey: "scheduling.gate.noStaffingNote",
			department: "Kitchen",
		},
		link: undefined,
	},
};

export const NoLongerReady: Story = {
	args: {
		gate: {
			messageKey: "scheduling.gate.noLongerStaffing",
			linkTo: "constraints",
			linkKey: "scheduling.gate.addStaffing",
			nextNoteKey: "scheduling.gate.noLongerNote",
			department: "Kitchen",
		},
	},
};
