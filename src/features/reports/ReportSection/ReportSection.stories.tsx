import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { ReportSection } from "@/features/reports/ReportSection";
import "@/common/i18n";

const meta = {
	title: "Features/Reports/ReportSection",
	component: ReportSection<string>,
	args: {
		id: "overtime",
		read: { status: "ready", data: "The table goes here." },
		children: (data: string): ReactNode => <p>{data}</p>,
	},
} satisfies Meta<typeof ReportSection<string>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Answered: Story = {};
export const Failed: Story = { args: { read: { status: "error" } } };
