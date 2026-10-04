import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, expect, it, vi } from "vitest";
import { Token } from "@/components/forms/Combobox/Token";
import es from "@/assets/locales/es/translations.json";
beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "es", resources: { es: { translation: es } } });
});
it("translates its removal name and supports keyboard removal unless disabled", async () => {
	const user = userEvent.setup();
	const onRemove = vi.fn();
	const { rerender } = render(<Token label="Marcus Lim" onRemove={onRemove} />);
	const remove = screen.getByRole("button", {
		name: es.combobox.remove.replace("{{label}}", "Marcus Lim"),
	});
	await user.tab();
	expect(remove).toHaveFocus();
	await user.keyboard("{Enter}");
	expect(onRemove).toHaveBeenCalledOnce();
	rerender(<Token disabled label="Marcus Lim" onRemove={onRemove} />);
	expect(remove).toBeDisabled();
	await user.click(remove);
	expect(onRemove).toHaveBeenCalledOnce();
});
