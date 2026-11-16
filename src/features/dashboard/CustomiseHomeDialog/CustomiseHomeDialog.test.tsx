import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { CustomiseHomeDialog } from "@/features/dashboard/CustomiseHomeDialog";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

/** The dialog over two sections, the second hidden. */
const renderDialog = (
	overrides: Partial<Parameters<typeof CustomiseHomeDialog>[0]> = {}
): {
	onToggle: ReturnType<typeof vi.fn>;
	onReset: ReturnType<typeof vi.fn>;
} => {
	const onToggle = vi.fn();
	const onReset = vi.fn();
	render(
		<CustomiseHomeDialog
			open
			hiddenSections={["people-events"]}
			saveFailed={false}
			sections={["short-shifts", "people-events"]}
			onClose={() => {}}
			onReset={onReset}
			onToggle={onToggle}
			{...overrides}
		/>
	);
	return { onToggle, onReset };
};

describe("CustomiseHomeDialog", () => {
	it("ticks the sections shown and leaves the hidden ones clear", () => {
		renderDialog();

		expect(
			screen.getByRole("checkbox", { name: "Shifts short" })
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Joining, probation and leaving" })
		).not.toBeChecked();
	});

	it("hides a section when its box is cleared", async () => {
		const user = userEvent.setup();
		const { onToggle } = renderDialog();

		await user.click(screen.getByRole("checkbox", { name: "Shifts short" }));

		expect(onToggle).toHaveBeenCalledWith("short-shifts", false);
	});

	it("resets to show every section", async () => {
		const user = userEvent.setup();
		const { onReset } = renderDialog();

		await user.click(screen.getByRole("button", { name: "Reset to default" }));

		expect(onReset).toHaveBeenCalled();
	});

	it("offers no reset when nothing is hidden", () => {
		renderDialog({ hiddenSections: [] });

		expect(
			screen.getByRole("button", { name: "Reset to default" })
		).toBeDisabled();
	});

	it("says plainly when a save was refused", () => {
		renderDialog({ saveFailed: true });

		expect(screen.getByRole("alert")).toHaveTextContent(
			"We couldn’t save your choice. It is back as it was; try again."
		);
	});
});
