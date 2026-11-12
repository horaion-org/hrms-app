import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import type { CompanyMember } from "@/features/organisation/api";
import {
	MemberPickerField,
	type MemberPickerFieldProps,
} from "@/features/organisation/MemberPickerField";
import "@/common/i18n";

const PEOPLE: Array<CompanyMember> = [
	{ membershipId: "m-2", displayName: "Aisha Rahman", status: "ACTIVE" },
	{ membershipId: "m-3", displayName: "Cheryl Ng", status: "ACTIVE" },
	{ membershipId: "m-5", displayName: "Siti Nurhaliza", status: "ACTIVE" },
];

const meta = {
	title: "Features/Organisation/MemberPickerField",
	component: MemberPickerField,
	args: {
		id: "story-people",
		label: "People",
		placeholder: "Choose people",
		hint: "They decide this step.",
		options: PEOPLE,
		loading: false,
		loadFailed: false,
		query: "",
		noResultsText: "Nobody can approve here yet.",
		footerText: "Showing people who can approve",
		value: [],
		onChange: fn(),
		onQueryChange: fn(),
	},
	// Keeps the choice and the search in the story, as a caller would; the list itself comes from the args.
	render: function Render(
		args: MemberPickerFieldProps
	): NonNullable<FunctionComponent> {
		const [value, setValue] = useState<Array<CompanyMember>>([]);
		const [single, setSingle] = useState<CompanyMember | null>(null);
		const [query, setQuery] = useState(args.query);
		const onQueryChange = (next: string): void => {
			setQuery(next);
			args.onQueryChange(next);
		};
		return (
			<div className="w-96 max-w-full">
				{args.multiple === false ? (
					<MemberPickerField
						{...args}
						multiple={false}
						query={query}
						value={single}
						onChange={setSingle}
						onQueryChange={onQueryChange}
					/>
				) : (
					<MemberPickerField
						{...args}
						multiple
						query={query}
						value={value}
						onChange={setValue}
						onQueryChange={onQueryChange}
					/>
				)}
			</div>
		);
	},
} satisfies Meta<typeof MemberPickerField>;

export default meta;

type Story = StoryObj<typeof meta>;

/** People to choose from, with the footer under them. */
export const PeopleListed: Story = {};

/** Nobody to choose from: the caller's empty line, and no footer. */
export const Nobody: Story = {
	args: { options: [], footerText: undefined },
};

/** The list could not be loaded: the load-failed line replaces the empty line. */
export const LoadFailed: Story = {
	args: { options: [], loadFailed: true, footerText: undefined },
};

/** One person, such as a manager, instead of several. */
export const OnePerson: Story = {
	args: { multiple: false, value: null, required: false, label: "Manager" },
};
