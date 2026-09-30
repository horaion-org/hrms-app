import type { Meta, StoryObj } from "@storybook/react-vite";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import en from "@/assets/locales/en/translations.json";
import type { FunctionComponent } from "@/common/types";
import { fn } from "storybook/test";
import { PasswordInput } from "@/components/forms/PasswordInput";

const english = createInstance();
void english.init({
	lng: "en",
	resources: { en: { translation: en } },
	initAsync: false,
});

const meta = {
	title: "Forms/PasswordInput",
	component: PasswordInput,
	args: {
		"aria-label": "Password",
		defaultValue: "correct horse",
		disabled: false,
		onChange: fn(),
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={english}>
				<Story />
			</I18nextProvider>
		),
	],
	argTypes: {
		status: { control: "select", options: [undefined, "success", "error"] },
		disabled: { control: "boolean" },
	},
} satisfies Meta<typeof PasswordInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { defaultValue: undefined } };

export const Error: Story = { args: { status: "error" } };

export const Disabled: Story = { args: { disabled: true } };
