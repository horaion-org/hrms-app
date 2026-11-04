import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { useState } from "react";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import type { FunctionComponent } from "@/common/types";
import {
	TimeZoneSelect,
	type TimeZoneSelectProps,
} from "@/components/forms/TimeZoneSelect";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

type HarnessProps = Omit<TimeZoneSelectProps, "value" | "onChange"> & {
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
		<TimeZoneSelect
			aria-label="Time zone"
			{...props}
			value={value}
			onChange={(next) => {
				setValue(next);
				onValue?.(next);
			}}
		/>
	);
};

const field = (): HTMLElement =>
	screen.getByRole("button", { name: "Time zone" });
const search = (): HTMLElement =>
	screen.getByRole("combobox", { name: "Search city, region or offset" });

describe("TimeZoneSelect", () => {
	it("starts empty and lists the viewer's zone first", async () => {
		render(<Harness viewerZone="Asia/Jakarta" />);
		expect(field()).toHaveTextContent("Select a time zone");
		await userEvent.click(field());
		const [first] = screen.getAllByRole("option");
		expect(first).toHaveTextContent(/^\(GMT\+07:00\) Asia\/Jakarta/);
		expect(first).toHaveTextContent("Your time zone");
		expect(first).toHaveTextContent(/\d{2}:\d{2}$/);
	});

	it("finds zones by offset and reports the chosen IANA name", async () => {
		const onValue = vi.fn();
		render(<Harness viewerZone="Asia/Jakarta" onValue={onValue} />);
		await userEvent.click(field());
		await userEvent.type(search(), "+09:00");
		const options = screen.getAllByRole("option");
		expect(options.length).toBeGreaterThan(0);
		for (const option of options)
			expect(option).toHaveTextContent(/^\(GMT\+09:00\)/);
		await userEvent.click(screen.getByRole("option", { name: /Asia\/Tokyo/ }));
		expect(onValue).toHaveBeenCalledWith("Asia/Tokyo");
		expect(field()).toHaveTextContent("(GMT+09:00) Asia/Tokyo");
	});

	it("finds zones by name, with spaces for underscores", async () => {
		render(<Harness viewerZone="Asia/Jakarta" />);
		await userEvent.click(field());
		await userEvent.type(search(), "sao paulo");
		expect(screen.getAllByRole("option")).toHaveLength(1);
		expect(screen.getByRole("option")).toHaveTextContent("America/Sao Paulo");
		await userEvent.clear(search());
		await userEvent.type(search(), "atlantis");
		expect(screen.queryByRole("option")).not.toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent(
			"No time zones found."
		);
	});

	it("shows a stored zone even when the browser doesn't list it", () => {
		render(<Harness initial="Mars/Olympus_Mons" viewerZone="Asia/Jakarta" />);
		expect(field()).toHaveTextContent("Mars/Olympus Mons");
	});
});
