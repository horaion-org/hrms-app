import { act, renderHook, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { SuccessNotifications } from "@/common/SuccessNotifications";
import type { FunctionComponent } from "@/common/types";
import {
	useReplaceMyAvailability,
	useReplaceMyWeekAvailability,
	useResetMyWeekAvailability,
} from "@/features/availability/useAvailability";
import { authTestI18n } from "@/features/auth/testingI18n";

// The API answers at once; only the confirmation is under test here.
vi.mock("@/features/availability/api", async (original) => ({
	...(await original<Record<string, unknown>>()),
	replaceAvailability: vi.fn(() => Promise.resolve({})),
	replaceWeekAvailability: vi.fn(() => Promise.resolve({})),
	deleteWeekAvailability: vi.fn(() => Promise.resolve()),
}));

/** The hook under test beside the app's success toast. */
const wrapper = ({ children }: { children: ReactNode }): FunctionComponent => (
	<I18nextProvider i18n={authTestI18n}>
		<QueryClientProvider client={new QueryClient()}>
			<SuccessNotifications />
			{children}
		</QueryClientProvider>
	</I18nextProvider>
);

describe("availability changes say what they did", () => {
	it("confirms a saved pattern", async () => {
		const { result } = renderHook(() => useReplaceMyAvailability("c-1"), {
			wrapper,
		});
		await act(async () => {
			await result.current.mutateAsync({ windows: [] });
		});
		expect(await screen.findByRole("status")).toHaveTextContent(
			"Availability saved."
		);
	});

	it("confirms a saved week", async () => {
		const { result } = renderHook(() => useReplaceMyWeekAvailability("c-1"), {
			wrapper,
		});
		await act(async () => {
			await result.current.mutateAsync({
				weekStartMonday: "2026-11-16",
				request: {},
			} as never);
		});
		expect(await screen.findByRole("status")).toHaveTextContent(
			"Availability saved."
		);
	});

	it("confirms a week put back on the usual availability", async () => {
		const { result } = renderHook(() => useResetMyWeekAvailability("c-1"), {
			wrapper,
		});
		await act(async () => {
			await result.current.mutateAsync("2026-11-16");
		});
		expect(await screen.findByRole("status")).toHaveTextContent(
			"This week follows the usual availability again."
		);
	});
});
