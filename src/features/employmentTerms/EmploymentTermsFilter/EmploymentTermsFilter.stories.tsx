import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { EmploymentTermsFilter } from "@/features/employmentTerms/EmploymentTermsFilter";
import { TERMS_OVERVIEW } from "@/features/employmentTerms/fixtures";
import { termsChoices } from "@/features/employmentTerms/termsFilter";
import "@/common/i18n";

const meta = {
	title: "Features/EmploymentTerms/EmploymentTermsFilter",
	component: EmploymentTermsFilter,
	parameters: { layout: "padded" },
	args: {
		choices: termsChoices(TERMS_OVERVIEW.terms, undefined),
		value: undefined,
		onChange: fn(),
	},
} satisfies Meta<typeof EmploymentTermsFilter>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Everyone: the active terms are offered. */
export const Everyone: Story = {};

/** Opened from a Settings link naming inactive terms that are still held. */
export const InactiveTermsChosen: Story = {
	args: {
		choices: termsChoices(TERMS_OVERVIEW.terms, "terms-part-time"),
		value: "terms-part-time",
	},
};
