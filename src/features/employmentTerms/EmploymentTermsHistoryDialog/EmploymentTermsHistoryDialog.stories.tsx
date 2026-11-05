import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmploymentTermsHistoryDialog } from "@/features/employmentTerms/EmploymentTermsHistoryDialog";
import { MEMBER_TERMS } from "@/features/employmentTerms/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/EmploymentTerms/EmploymentTermsHistoryDialog",
	component: EmploymentTermsHistoryDialog,
	args: {
		displayName: "Aisyah Rahman",
		history: MEMBER_TERMS.history,
		canChange: true,
		onCorrect: (): void => {},
		onCancelChange: (): void => {},
		onClose: (): void => {},
	},
} satisfies Meta<typeof EmploymentTermsHistoryDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A change ahead (Scheduled, cancellable) and the imported first entry. */
export const Changeable: Story = {};

/** Read-only: no Correct or Cancel. */
export const ReadOnly: Story = { args: { canChange: false } };

export const Empty: Story = { args: { history: [] } };
