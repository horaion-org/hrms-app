import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { Pagination } from "@/components/ui/Pagination";

it("handles the partial final page and prevents stepping past it", async () => {
	const onPageChange = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<Pagination
				page={3}
				pageSize={10}
				total={24}
				onPageChange={onPageChange}
			/>
		</I18nextProvider>
	);
	expect(screen.getByText("21–24 of 24 entries")).toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
	await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
	expect(onPageChange).toHaveBeenCalledWith(2);
});

it("shows a zero range and disables navigation for an empty result", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<Pagination page={1} pageSize={10} total={0} onPageChange={vi.fn()} />
		</I18nextProvider>
	);
	expect(screen.getByText("0–0 of 0 entries")).toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
	expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
});
