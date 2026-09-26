import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Heroicon } from "@/common/types";
import * as icons from "@/components/ui/Icon";
import catalogue from "@/components/ui/Icon/generator/catalogue.json";

const meta = {
	title: "UI/Icon",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
const exportsByName: Record<string, Heroicon> = icons;

/** Sheet order, with the design's 16px, 24px and 32px sizes beside each label. */
export const Gallery: Story = {
	render: () => (
		<div className="overflow-x-auto bg-white p-8 text-neutral-900">
			<div className="grid grid-cols-6 gap-8 min-w-max">
				{catalogue.map((group, groupIndex) => (
					<ul key={groupIndex} className="space-y-8">
						{group.map(({ name, exportName }) => {
							const Icon = exportsByName[exportName];
							if (!Icon) throw new Error(`Missing ${exportName}`);
							return (
								<li key={name} className="flex h-12 items-center gap-4">
									<Icon className="size-4 shrink-0" />
									<Icon className="size-6 shrink-0" />
									<Icon className="size-8 shrink-0" />
									<span className="text-sm">{name}</span>
								</li>
							);
						})}
					</ul>
				))}
			</div>
		</div>
	),
};
