import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import {
	PhoneInput,
	type PhoneInputProps,
} from "@/components/forms/PhoneInput";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

type HarnessProps = Omit<PhoneInputProps, "value" | "onChange"> & {
	initial?: string;
	onValue?: (value: string) => void;
};

/** Holds the value like a form would, reporting each change. */
const Harness = ({
	initial = "",
	onValue,
	...props
}: HarnessProps): FunctionComponent => {
	const [value, setValue] = useState(initial);
	return (
		<PhoneInput
			{...props}
			value={value}
			onChange={(next) => {
				setValue(next);
				onValue?.(next);
			}}
		/>
	);
};

const codeButton = (): HTMLElement =>
	screen.getByRole("button", { name: /^Country code/ });
const numberBox = (): HTMLElement =>
	screen.getByRole("textbox", { name: "Phone number" });

const chooseCountry = async (
	user: ReturnType<typeof userEvent.setup>,
	search: string,
	option: string
): Promise<void> => {
	await user.click(codeButton());
	await user.type(
		screen.getByRole("combobox", { name: "Search country or code" }),
		search
	);
	await user.click(screen.getByRole("option", { name: option }));
};

describe("PhoneInput typing", () => {
	it("starts on the default country and reports E.164 without spaces", async () => {
		const user = userEvent.setup();
		const changed = vi.fn();
		render(
			<Harness defaultCountry="SG" placeholder="8123 4567" onValue={changed} />
		);
		expect(codeButton()).toHaveTextContent("+65");
		expect(codeButton()).toHaveAccessibleName("Country code: Singapore +65");
		expect(numberBox()).toHaveAttribute("placeholder", "8123 4567");
		await user.type(numberBox(), "8123 4567");
		expect(numberBox()).toHaveValue("8123 4567");
		expect(changed).toHaveBeenLastCalledWith("+6581234567");
	});

	it("ignores anything but digits and spaces", async () => {
		const user = userEvent.setup();
		const changed = vi.fn();
		render(<Harness defaultCountry="SG" onValue={changed} />);
		await user.type(numberBox(), "8a1-2(3)+");
		expect(numberBox()).toHaveValue("8123");
		expect(changed).toHaveBeenLastCalledWith("+658123");
	});

	it("reports an empty string once the number is cleared", async () => {
		const user = userEvent.setup();
		const changed = vi.fn();
		render(<Harness initial="+6583247931" onValue={changed} />);
		await user.clear(numberBox());
		expect(changed).toHaveBeenLastCalledWith("");
		expect(codeButton()).toHaveTextContent("+65");
	});

	it("keeps the typed number when the country changes", async () => {
		const user = userEvent.setup();
		const changed = vi.fn();
		render(<Harness initial="+6583247931" onValue={changed} />);
		await chooseCountry(user, "malay", "Malaysia +60");
		expect(changed).toHaveBeenLastCalledWith("+6083247931");
		expect(codeButton()).toHaveTextContent("+60");
		expect(numberBox()).toHaveValue("83247931");
	});
});

describe("PhoneInput reading a value", () => {
	it("splits an existing value into its code and national number", () => {
		render(<Harness initial="+6583247931" />);
		expect(codeButton()).toHaveTextContent("+65");
		expect(numberBox()).toHaveValue("83247931");
	});

	it("matches the longest known code", () => {
		render(<Harness initial="+358401234567" />);
		expect(codeButton()).toHaveAccessibleName("Country code: Finland +358");
		expect(numberBox()).toHaveValue("401234567");
	});

	it("shows a shared code's primary region, or the default country when it shares the code", () => {
		const { unmount } = render(<Harness initial="+14165550123" />);
		expect(codeButton()).toHaveAccessibleName("Country code: United States +1");
		expect(numberBox()).toHaveValue("4165550123");
		unmount();
		render(<Harness defaultCountry="CA" initial="+14165550123" />);
		expect(codeButton()).toHaveAccessibleName("Country code: Canada +1");
	});

	it("keeps a chosen country that shares the value's code", async () => {
		const user = userEvent.setup();
		const changed = vi.fn();
		render(<Harness initial="+14165550123" onValue={changed} />);
		await chooseCountry(user, "canada", "Canada +1");
		expect(changed).not.toHaveBeenCalled();
		await user.type(numberBox(), "4");
		expect(changed).toHaveBeenLastCalledWith("+141655501234");
		expect(codeButton()).toHaveAccessibleName("Country code: Canada +1");
	});

	it("keeps a value with no known code, unchanged until edited", async () => {
		const user = userEvent.setup();
		const changed = vi.fn();
		render(<Harness initial="+999123456" onValue={changed} />);
		expect(codeButton()).toHaveAccessibleName("Country code");
		expect(codeButton()).toHaveTextContent("Code");
		expect(numberBox()).toHaveValue("999123456");
		expect(changed).not.toHaveBeenCalled();
		await chooseCountry(user, "65", "Singapore +65");
		expect(changed).toHaveBeenLastCalledWith("+65999123456");
	});

	it("re-reads the value when it changes from outside", () => {
		const { rerender } = render(
			<PhoneInput value="+6583247931" onChange={vi.fn()} />
		);
		rerender(<PhoneInput value="+60123456789" onChange={vi.fn()} />);
		expect(codeButton()).toHaveTextContent("+60");
		expect(numberBox()).toHaveValue("123456789");
		rerender(<PhoneInput value="" onChange={vi.fn()} />);
		expect(codeButton()).toHaveTextContent("Code");
		expect(numberBox()).toHaveValue("");
	});
});

describe("PhoneInput countries", () => {
	it("chooses no country without a value or default, and reports bare digits until one is chosen", async () => {
		const user = userEvent.setup();
		const changed = vi.fn();
		render(<Harness onValue={changed} />);
		expect(codeButton()).toHaveTextContent("Code");
		await user.type(numberBox(), "8123");
		expect(changed).toHaveBeenLastCalledWith("8123");
		await chooseCountry(user, "japan", "Japan +81");
		expect(changed).toHaveBeenLastCalledWith("+818123");
	});

	const searchFor = async (query: string): Promise<Array<string | null>> => {
		const user = userEvent.setup();
		render(<Harness />);
		await user.click(codeButton());
		if (query)
			await user.type(
				screen.getByRole("combobox", { name: "Search country or code" }),
				query
			);
		// Read by selector: role queries over many options are slow in jsdom.
		return [
			...screen.getByRole("listbox").querySelectorAll('[role="option"]'),
		].map((option) => option.getAttribute("aria-label"));
	};

	it("lists every country with its code", async () => {
		const options = await searchFor("");
		expect(options).toHaveLength(249);
		expect(options).toContain("Singapore +65");
		expect(options).toContain("United States +1");
	});

	it("searches by country name", async () => {
		expect(await searchFor("sing")).toEqual(["Singapore +65"]);
	});

	it("searches by code with the plus", async () => {
		expect((await searchFor("+44")).sort()).toEqual([
			"Guernsey +44",
			"Isle of Man +44",
			"Jersey +44",
			"United Kingdom +44",
		]);
	});

	it("searches by the start of a code without the plus", async () => {
		const options = await searchFor("85");
		expect(options).toContain("Hong Kong SAR China +852");
		expect(options).not.toContain("Singapore +65");
	});
});

describe("PhoneInput as a form control", () => {
	it("is one labelled group whose parts carry the field's description, error and ref", () => {
		const ref = vi.fn();
		const { labelId, errorId } = formRowIds("phone");
		render(
			<FormRow
				error="Enter a valid phone number"
				htmlFor="phone"
				label="Phone number"
			>
				<PhoneInput
					ref={ref}
					aria-required
					aria-describedby={errorId}
					aria-labelledby={labelId}
					id="phone"
					name="phone"
					status="error"
					value="+6583247931"
					onChange={vi.fn()}
				/>
			</FormRow>
		);
		const group = screen.getByRole("group", { name: "Phone number" });
		const box = within(group).getByRole("textbox", { name: "Phone number" });
		expect(box).toHaveAttribute("id", "phone");
		expect(box).toHaveAttribute("name", "phone");
		expect(box).toHaveAttribute("type", "tel");
		expect(box).toHaveAttribute("inputmode", "tel");
		expect(box).toHaveAttribute("autocomplete", "tel-national");
		expect(box).toHaveAttribute("aria-invalid", "true");
		expect(box).toHaveAttribute("aria-required", "true");
		expect(box).toHaveAccessibleDescription("Enter a valid phone number");
		expect(ref).toHaveBeenCalledWith(box);
		const code = within(group).getByRole("button", { name: /^Country code/ });
		expect(code).toHaveAttribute("aria-invalid", "true");
		expect(code).toHaveAccessibleDescription("Enter a valid phone number");
		expect(box.parentElement).toHaveClass("border-error-600");
	});

	it("cannot be changed while disabled", async () => {
		const user = userEvent.setup();
		const changed = vi.fn();
		render(<Harness disabled initial="+6583247931" onValue={changed} />);
		expect(numberBox()).toBeDisabled();
		expect(codeButton()).toBeDisabled();
		await user.type(numberBox(), "1");
		await user.click(codeButton());
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		expect(changed).not.toHaveBeenCalled();
	});

	it("reports leaving the number box", async () => {
		const user = userEvent.setup();
		const blurred = vi.fn();
		render(<Harness defaultCountry="SG" onBlur={blurred} />);
		await user.click(numberBox());
		await user.tab();
		expect(blurred).toHaveBeenCalledTimes(1);
	});

	it("round-trips through a Controller, which focuses the number box", async () => {
		const user = userEvent.setup();
		const submitted = vi.fn();
		const Form = (): FunctionComponent => {
			const { control, handleSubmit, setFocus } = useForm({
				defaultValues: { phone: "+6583247931" },
			});
			return (
				<form onSubmit={(event) => void handleSubmit(submitted)(event)}>
					<Controller
						control={control}
						name="phone"
						render={({ field }) => (
							<PhoneInput
								ref={field.ref}
								defaultCountry="SG"
								name={field.name}
								value={field.value}
								onBlur={field.onBlur}
								onChange={field.onChange}
							/>
						)}
					/>
					<button
						type="button"
						onClick={() => {
							setFocus("phone");
						}}
					>
						Focus phone
					</button>
					<button type="submit">Save</button>
				</form>
			);
		};
		render(<Form />);
		expect(numberBox()).toHaveValue("83247931");
		await user.click(screen.getByRole("button", { name: "Focus phone" }));
		expect(numberBox()).toHaveFocus();
		await user.clear(numberBox());
		await user.type(numberBox(), "9123 4567");
		await chooseCountry(user, "malaysia", "Malaysia +60");
		await user.click(screen.getByRole("button", { name: "Save" }));
		await waitFor(() => {
			expect(submitted).toHaveBeenCalledWith(
				{ phone: "+6091234567" },
				expect.anything()
			);
		});
		expect(numberBox()).toHaveValue("9123 4567");
	});
});
