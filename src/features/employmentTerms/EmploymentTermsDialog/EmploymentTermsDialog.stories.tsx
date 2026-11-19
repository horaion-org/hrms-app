import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { termsPresetsQuery } from "@/features/employmentTerms/api";
import { EmploymentTermsDialog } from "@/features/employmentTerms/EmploymentTermsDialog";
import {
	FIVE_DAY_WEEK,
	SIX_DAY_SHIFT,
	TERMS_PRESETS,
} from "@/features/employmentTerms/fixtures";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import "@/common/i18n";

const COMPANY = "story-company";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

/** A story's play step that presses the "Start from" button of one preset. */
const startFrom =
	(presetName: string) =>
	async ({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> => {
		// The dialog is portalled into the page's body, outside the story's canvas.
		const page = within(canvasElement.ownerDocument.body);
		await userEvent.click(
			await page.findByRole("button", { name: new RegExp(presetName) })
		);
	};

/** Starts from the managers' preset (not under the Act's hour rules), then chooses how extra hours are paid. */
const notCoveredPaidAs =
	(choice: string) =>
	async ({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> => {
		await startFrom("Managers and executives")({ canvasElement });
		await userEvent.click(
			await within(canvasElement.ownerDocument.body).findByRole("radio", {
				name: choice,
			})
		);
	};

const meta = {
	title: "Features/EmploymentTerms/EmploymentTermsDialog",
	component: EmploymentTermsDialog,
	parameters: { layout: "fullscreen" },
	args: { companyId: COMPANY, onSaved: fn(), onClose: fn() },
	decorators: [storyProviders(client)],
	// Every save is refused with a 500, so the form-level alert can be shown; the country's figures come from the fixtures.
	beforeEach: (): (() => void) => {
		const restore = stubStoryApi([], false, client);
		client.setQueryData(termsPresetsQuery(COMPANY).queryKey, TERMS_PRESETS);
		return restore;
	},
} satisfies Meta<typeof EmploymentTermsDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** New terms start from the first preset: five days, 44 h, under the Act's hour rules. */
export const NewFiveDays: Story = {};

/** New terms from the 5½-day preset: a half day in the week. */
export const NewFiveAndAHalfDays: Story = {
	play: startFrom("Full-time, 5½ days"),
};

/** New terms from the 6-day preset: the roster picks the rest day. */
export const NewSixDays: Story = { play: startFrom("Full-time, 6 days") };

/** New terms from the part-time preset: no rest day asked, part-time overtime explained. */
export const NewPartTime: Story = { play: startFrom("Part-time, 20 h") };

/** Not under the Act's hour rules, extra hours part of the job: no rate is asked. */
export const NotCoveredNothingExtra: Story = {
	play: startFrom("Managers and executives"),
};

/** Not under the Act's hour rules, extra hours paid at a rate: the rates are asked with no legal minimum. */
export const NotCoveredPaidAtRate: Story = {
	play: notCoveredPaidAs("Paid at a rate"),
};

/** Not under the Act's hour rules, extra hours earned as time off. */
export const NotCoveredTimeOff: Story = {
	play: notCoveredPaidAs("Time off instead"),
};

/** Existing terms nobody holds, opened on their own answers. */
export const EditUnheld: Story = { args: { editing: FIVE_DAY_WEEK } };

/** Existing terms people hold: the description says how many. */
export const EditHeld: Story = { args: { editing: SIX_DAY_SHIFT } };

/** The server refuses the save: the form says so above its fields. */
export const SaveRefused: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const page = within(canvasElement.ownerDocument.body);
		await userEvent.click(
			await page.findByRole("button", { name: "Add employment terms" })
		);
		await page.findByRole("alert");
	},
};
