import { act, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { PageLoading, SLOW_LOADING_AFTER_MS } from "@/pages/PageLoading";

const SLOW_LINE =
	"This is taking longer than usual. If something was just changed, access may still be updating.";

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

it("says only Loading at first, then why it may be slow once it takes a while", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<PageLoading />
		</I18nextProvider>
	);

	expect(screen.getByRole("status")).toHaveTextContent("Loading…");
	expect(screen.queryByText(SLOW_LINE)).not.toBeInTheDocument();

	act(() => {
		vi.advanceTimersByTime(SLOW_LOADING_AFTER_MS);
	});
	expect(screen.getByText(SLOW_LINE)).toBeInTheDocument();
});
