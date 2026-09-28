import { Link } from "@tanstack/react-router";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { MemoryRouterHarness } from "./MemoryRouterHarness";

const Links = (): FunctionComponent => (
	<nav aria-label="Sample" className="flex gap-4">
		{(["/", "/register"] as const).map((to) => (
			<Link
				key={to}
				activeOptions={{ exact: true }}
				className="underline data-[status=active]:font-bold"
				to={to}
			>
				{to}
			</Link>
		))}
	</nav>
);

const meta = {
	title: "Utils/MemoryRouterHarness",
	component: MemoryRouterHarness,
	args: { children: <Links />, initialEntry: "/" },
	argTypes: {
		children: { control: false },
		initialEntry: { control: "inline-radio", options: ["/", "/register"] },
	},
} satisfies Meta<typeof MemoryRouterHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The bold link is the router's current location; click to navigate in memory. */
export const Default: Story = {};

export const StartAtExample: Story = { args: { initialEntry: "/register" } };
