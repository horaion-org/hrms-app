import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { authTestI18n } from "@/features/auth/testingI18n";
import { RunningPeopleImport } from "./RunningPeopleImport";

const meta = {
	title: "Features/Imports/RunningPeopleImport",
	component: RunningPeopleImport,
	parameters: { layout: "padded" },
	decorators: [
		withMemoryRouter,
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	args: { importId: "p-7" },
} satisfies Meta<typeof RunningPeopleImport>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The check names the running import, so the link opens it. */
export const Known: Story = {};

/** The API refused the import as running without naming it; the link opens the page that lists it. */
export const Unknown: Story = { args: { importId: undefined } };
