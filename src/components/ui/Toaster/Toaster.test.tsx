import { composeStories } from "@storybook/react-vite";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ApiProblemError } from "@/common/problem";
import { Toaster } from "@/components/ui/Toaster";
import * as stories from "@/components/ui/Toaster/Toaster.stories";
import {
	notifyError,
	notifySuccess,
	useToastStore,
} from "@/store/useToastStore";

const i18n = createInstance();
beforeAll(async () => {
	await i18n.use(initReactI18next).init({
		lng: "en",
		resources: { en: { translation: en } },
	});
});

afterEach(() => {
	useToastStore.setState({ toasts: [] });
});

describe("Toaster", () => {
	it("keeps an empty live region mounted so later toasts are announced", () => {
		const { container } = render(<Toaster />);

		expect(container.firstChild).toHaveAttribute("aria-live", "polite");
		expect(container.firstChild).toBeEmptyDOMElement();
	});

	it("shows success as a status and failures as an alert", () => {
		render(<Toaster />);

		act(() => {
			notifySuccess("Saved");
			notifyError(new ApiProblemError(409, { detail: "Refused" }), "Fallback");
		});

		expect(screen.getByRole("status")).toHaveTextContent("Saved");
		expect(screen.getByRole("status")).toHaveClass("bg-success-600");
		expect(screen.getByRole("alert")).toHaveTextContent("Refused");
		expect(screen.getByRole("alert")).toHaveClass("bg-error-600");
	});

	it("dismisses a toast with its close button", async () => {
		render(<Toaster />);
		act(() => {
			notifySuccess("Saved");
		});

		await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));

		expect(screen.queryByText("Saved")).not.toBeInTheDocument();
	});
});

describe("Toaster stories", () => {
	const { Success, Error, Stacked, Empty } = composeStories(stories);

	it.each([
		{ Story: Success, count: 1 },
		{ Story: Error, count: 1 },
		{ Story: Stacked, count: 2 },
		{ Story: Empty, count: 0 },
	])("renders $count toast(s) for $Story.storyName", ({ Story, count }) => {
		render(<Story />);

		expect(screen.queryAllByRole("button", { name: "Dismiss" })).toHaveLength(
			count
		);
	});
});
