import type { Meta, StoryObj, Decorator } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { Combobox, type ComboboxProps } from "@/components/forms/Combobox";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import "@/common/i18n";

type Person = { id: string; name: string };
const people: Array<Person> = [
	{ id: "marcus", name: "Marcus Lim" },
	{ id: "sarah", name: "Sarah Tan" },
	{ id: "wei", name: "Wei Chen" },
	{ id: "priya", name: "Priya Kumar" },
	{ id: "daniel", name: "Daniel Ong" },
	{ id: "aisha", name: "Aisha Rahman" },
];
const meta = {
	title: "Forms/Combobox",
	component: Combobox<Person>,
	args: {
		"aria-label": "Branch heads",
		options: people,
		value: [],
		query: "",
		getKey: (person: Person): string => person.id,
		getLabel: (person: Person): string => person.name,
		placeholder: "Select branch heads",
		searchPlaceholder: "Search people",
		maxSelected: 20,
		footer: "Only active people are shown.",
		onChange: fn(),
		onQueryChange: fn(),
		renderOption: (person: Person): FunctionComponent => (
			<span className="flex w-full items-center gap-3">
				<Avatar
					aria-hidden="true"
					className="size-8 text-xs"
					name={person.name}
				/>
				<span className="min-w-0 flex-1 truncate">{person.name}</span>
				<Badge className="normal-case" tone="success">
					Active
				</Badge>
			</span>
		),
	},
	render: function Render(
		args: ComboboxProps<Person>
	): NonNullable<FunctionComponent> {
		const [value, setValue] = useState(
			args.multiple === false ? [] : args.value
		);
		const [singleValue, setSingleValue] = useState(
			args.multiple === false ? args.value : null
		);
		const [query, setQuery] = useState(args.query);
		if (args.multiple === false)
			return (
				<div className="w-96 max-w-full">
					<Combobox
						{...args}
						query={query}
						value={singleValue}
						options={args.options.filter((person) =>
							person.name.toLowerCase().includes(query.toLowerCase())
						)}
						onChange={(next: Person | null) => {
							setSingleValue(next);
							args.onChange(next);
						}}
						onQueryChange={(next) => {
							setQuery(next);
							args.onQueryChange(next);
						}}
					/>
				</div>
			);
		return (
			<div className="w-96 max-w-full">
				<Combobox
					{...args}
					query={query}
					value={value}
					options={args.options.filter((person) =>
						person.name.toLowerCase().includes(query.toLowerCase())
					)}
					onChange={(next) => {
						setValue(next);
						args.onChange(next);
					}}
					onQueryChange={(next) => {
						setQuery(next);
						args.onQueryChange(next);
					}}
				/>
			</div>
		);
	},
} satisfies Meta<typeof Combobox<Person>>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SingleEmpty = {
	args: {
		multiple: false,
		value: null,
		maxSelected: undefined,
		"aria-label": "Branch head",
		placeholder: "Select a branch head",
	},
} satisfies Story;
export const SingleChosen: Story = {
	args: { ...SingleEmpty.args, value: people[0] ?? null },
};
export const SingleError: Story = {
	args: { ...SingleEmpty.args, status: "error" },
};
export const Empty: Story = {};
export const TwoChosen: Story = { args: { value: people.slice(0, 2) } };
export const Loading: Story = { args: { options: [], loading: true } };
export const NoResults: Story = { args: { options: [] } };
export const MaximumReached: Story = {
	args: { value: people.slice(0, 2), maxSelected: 2 },
};
export const Error: Story = { args: { status: "error" } };
export const Disabled: Story = {
	args: { disabled: true, value: people.slice(0, 2) },
};
export const LongListNearBottom: Story = {
	args: {
		options: Array.from({ length: 20 }, (_, index) => ({
			id: String(index),
			name: `Person ${index + 1}`,
		})),
	},
	decorators: [
		(Story: Parameters<Decorator>[0]): NonNullable<FunctionComponent> => (
			<div className="flex min-h-[80vh] items-end">
				<Story />
			</div>
		),
	],
	parameters: {
		docs: {
			description: {
				story:
					"Open near the viewport bottom to review upward flipping, narrow viewports, and the five-row scroll cap.",
			},
		},
	},
};
