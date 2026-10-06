import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import {
	PhoneInput,
	type PhoneInputProps,
} from "@/components/forms/PhoneInput";
import { Button } from "@/components/ui/Button";
import "@/common/i18n";

const meta = {
	title: "Forms/PhoneInput",
	component: PhoneInput,
	args: {
		value: "",
		defaultCountry: "SG",
		placeholder: "8123 4567",
		onChange: fn(),
	},
	render: function Render(
		args: PhoneInputProps
	): NonNullable<FunctionComponent> {
		const [value, setValue] = useState(args.value);
		return (
			<div className="w-95 max-w-full">
				<PhoneInput
					{...args}
					value={value}
					onChange={(next) => {
						setValue(next);
						args.onChange(next);
					}}
				/>
			</div>
		);
	},
} satisfies Meta<typeof PhoneInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyWithDefaultCountry: Story = {};

/** No default country: the person chooses a code first. */
export const EmptyWithoutDefaultCountry: Story = {
	args: { defaultCountry: undefined },
};

export const WithValue: Story = { args: { value: "+6583247931" } };

/** +1 is shared; the default country is shown when it has the code. */
export const SharedCode: Story = {
	args: { value: "+14165550123", defaultCountry: "CA" },
};

/** No known code: the digits stay in the number box for the person to fix. */
export const UnknownCode: Story = { args: { value: "+999123456" } };

export const Error: Story = {
	args: { value: "+65812", status: "error" },
};

export const Disabled: Story = {
	args: { value: "+6583247931", disabled: true },
};

/** The Add employee form's row, wired through react-hook-form. */
export const InFormRow: Story = {
	parameters: { layout: "padded" },
	render: function Render(args): NonNullable<FunctionComponent> {
		const { labelId, errorId } = formRowIds("story-phone");
		const { control, handleSubmit, formState } = useForm({
			defaultValues: { phone: "" },
		});
		const error = formState.errors.phone?.message;
		return (
			<form
				className="flex max-w-132 flex-col gap-4"
				onSubmit={(event) => void handleSubmit(fn())(event)}
			>
				<FormRow
					required
					error={error}
					htmlFor="story-phone"
					label="Phone number"
				>
					<Controller
						control={control}
						name="phone"
						render={({ field }) => (
							<PhoneInput
								ref={field.ref}
								aria-required
								aria-describedby={error ? errorId : undefined}
								aria-labelledby={labelId}
								className="w-full"
								defaultCountry={args.defaultCountry}
								id="story-phone"
								name={field.name}
								placeholder={args.placeholder}
								status={error ? "error" : undefined}
								value={field.value}
								onBlur={field.onBlur}
								onChange={field.onChange}
							/>
						)}
						rules={{
							pattern: {
								value: /^\+[1-9]\d{6,14}$/,
								message: "Enter a phone number with its country code.",
							},
						}}
					/>
				</FormRow>
				<Button className="self-end" size="sm" type="submit">
					Save
				</Button>
			</form>
		);
	},
};
