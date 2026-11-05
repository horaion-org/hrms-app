import type { Meta, StoryObj } from "@storybook/react-vite";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import en from "@/assets/locales/en/translations.json";
import type { FunctionComponent } from "@/common/types";
import { AuthLayout } from "@/components/layout/AuthLayout";

const english = createInstance();
void english.init({
	lng: "en",
	resources: { en: { translation: en } },
	initAsync: false,
});

const meta = {
	title: "Layout/AuthLayout",
	component: AuthLayout,
	parameters: { layout: "fullscreen" },
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={english}>
				<Story />
			</I18nextProvider>
		),
	],
	args: {
		children: (
			<div className="space-y-4">
				<h1 className="text-xl font-semibold text-neutral-900">Page title</h1>
				<p className="text-sm text-neutral-900/60">
					The page&rsquo;s form renders here.
				</p>
			</div>
		),
	},
} satisfies Meta<typeof AuthLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
