import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { PasswordInput } from "@/components/forms/PasswordInput";
import * as stories from "@/components/forms/PasswordInput/PasswordInput.stories";

const i18n = createInstance();
beforeAll(async () => {
	await i18n.use(initReactI18next).init({
		lng: "en",
		resources: { en: { translation: en } },
	});
});

const passwordField = (): HTMLInputElement =>
	screen.getByLabelText("Password", { selector: "input" });

describe("PasswordInput", () => {
	it("supports translated confirmation toggle names", async () => {
		const user = userEvent.setup();
		render(
			<PasswordInput
				aria-label="Confirm password"
				toggleLabels={{
					show: en.auth.showConfirmedPassword,
					hide: en.auth.hideConfirmedPassword,
				}}
			/>
		);
		const toggle = screen.getByRole("button", {
			name: "Show confirmed password",
		});
		await user.click(toggle);
		expect(toggle).toHaveAccessibleName("Hide confirmed password");
		expect(toggle).toHaveAttribute("aria-pressed", "true");
		await user.click(toggle);
		expect(toggle).toHaveAccessibleName("Show confirmed password");
	});

	it("inherits a disabled fieldset for both input and toggle", async () => {
		const user = userEvent.setup();
		render(
			<fieldset disabled>
				<PasswordInput aria-label="Password" />
			</fieldset>
		);
		const toggle = screen.getByRole("button", { name: "Show password" });
		expect(passwordField()).toBeDisabled();
		expect(toggle).toBeDisabled();
		await user.click(toggle);
		expect(passwordField()).toHaveAttribute("type", "password");
		expect(toggle).toHaveAttribute("aria-pressed", "false");
	});

	it("forwards the input ref and toggles by keyboard without submitting", async () => {
		const user = userEvent.setup();
		const ref = createRef<HTMLInputElement>();
		const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
		});
		render(
			<form onSubmit={onSubmit}>
				<PasswordInput ref={ref} aria-label="Password" name="password" />
			</form>
		);
		expect(ref.current).toBe(passwordField());
		ref.current?.focus();
		expect(passwordField()).toHaveFocus();
		await user.type(passwordField(), "secret");
		await user.tab();
		await user.keyboard("{Enter}");
		expect(passwordField()).toHaveAttribute("type", "text");
		expect(passwordField()).toHaveValue("secret");
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("hides what was typed until the toggle is pressed", async () => {
		const user = userEvent.setup();
		render(<PasswordInput aria-label="Password" />);

		await user.type(passwordField(), "secret");
		expect(passwordField()).toHaveAttribute("type", "password");

		const toggle = screen.getByRole("button", { name: "Show password" });
		expect(toggle).toHaveAttribute("aria-pressed", "false");

		await user.click(toggle);
		expect(passwordField()).toHaveAttribute("type", "text");
		expect(passwordField()).toHaveValue("secret");
		expect(toggle).toHaveAttribute("aria-pressed", "true");
		expect(toggle).toHaveAccessibleName("Hide password");

		await user.click(toggle);
		expect(passwordField()).toHaveAttribute("type", "password");
		expect(toggle).toHaveAttribute("aria-pressed", "false");
		expect(toggle).toHaveAccessibleName("Show password");
	});

	it("keeps the toggle after the field in the tab order", async () => {
		const user = userEvent.setup();
		render(<PasswordInput aria-label="Password" />);

		await user.tab();
		expect(passwordField()).toHaveFocus();
		await user.tab();
		expect(screen.getByRole("button", { name: "Show password" })).toHaveFocus();
	});

	it("disables the toggle with the field", () => {
		render(<PasswordInput disabled aria-label="Password" />);

		expect(passwordField()).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Show password" })
		).toBeDisabled();
	});

	it("passes Input props such as status and autoComplete through", () => {
		render(
			<PasswordInput
				aria-label="Password"
				autoComplete="new-password"
				status="error"
			/>
		);

		expect(passwordField()).toHaveAttribute("autocomplete", "new-password");
		expect(passwordField()).toHaveAttribute("aria-invalid", "true");
	});
});

describe("PasswordInput stories", () => {
	const { Default, Empty, Error, Disabled } = composeStories(stories);

	it.each([Default, Empty, Error, Disabled])("renders $storyName", (Story) => {
		render(<Story />);

		expect(passwordField()).toHaveAttribute("type", "password");
	});
});
