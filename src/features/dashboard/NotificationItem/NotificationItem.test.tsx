import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { NotificationItem } from "@/features/dashboard/NotificationItem";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("NotificationItem", () => {
	it("given_aNotification_when_answered_then_reportsEachAction", async () => {
		const user = userEvent.setup();
		const approve = vi.fn();
		const deny = vi.fn();
		const open = vi.fn();
		render(
			<NotificationItem
				detail="from John Lim (12–14 May)"
				primaryAction={{ label: "Approve", onClick: approve }}
				secondaryAction={{ label: "Deny with reason", onClick: deny }}
				title="Annual leave request"
				onOpen={open}
			/>
		);

		expect(
			screen.getByText("from John Lim (12–14 May)", { exact: false })
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Approve" }));
		await user.click(screen.getByRole("button", { name: "Deny with reason" }));
		await user.click(
			screen.getByRole("button", { name: "Open Annual leave request" })
		);

		expect(approve).toHaveBeenCalled();
		expect(deny).toHaveBeenCalled();
		expect(open).toHaveBeenCalled();
	});

	it("given_anExample_when_rendered_then_isTaggedWithItsActionsOff", () => {
		render(
			<NotificationItem
				detail="for Saturday"
				primaryAction={{ label: "Fill shift", disabled: true }}
				secondaryAction={{ label: "Dismiss", disabled: true }}
				tag="Example"
				title="Staff shortage detected"
			/>
		);

		expect(screen.getByText("Example")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Fill shift" })).toBeDisabled();
		expect(screen.queryByRole("button", { name: /^Open/ })).toBeNull();
	});
});
