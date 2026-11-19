import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import type { Finding } from "@/features/reports/reportFindings";
import { ReportSection } from "@/features/reports/ReportSection";
import "@/common/i18n";

const meta = {
	title: "Features/Reports/ReportSection",
	component: ReportSection<string>,
	args: {
		id: "overtime",
		read: { status: "ready", data: "The table goes here." },
		findingOf: (): Finding => ({ key: "overLimit", values: { count: 2 } }),
		isEmpty: (): boolean => false,
		children: (data: string): ReactNode => <p>{data}</p>,
	},
} satisfies Meta<typeof ReportSection<string>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Answered: Story = {};
export const Empty: Story = { args: { isEmpty: (): boolean => true } };
export const Failed: Story = { args: { read: { status: "error" } } };
/** The chosen dates can't be asked for, so nothing loads. */
export const RangeInvalid: Story = {
	args: { read: { status: "pending" }, rangeInvalid: true },
};
