import { act, renderHook, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { SuccessNotifications } from "@/common/SuccessNotifications";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	useReplaceMemberPreferenceDay,
	useReplaceMyPreferenceDay,
} from "@/features/shiftPreferences/useShiftPreferences";

// The API answers at once; only the confirmation is under test here.
vi.mock("@/features/shiftPreferences/api", async (original) => ({
	...(await original<Record<string, unknown>>()),
	replaceMyPreferenceDay: vi.fn(() => Promise.resolve({})),
	replaceMemberPreferenceDay: vi.fn(() => Promise.resolve({})),
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

const day = { date: "2026-11-18", shiftIds: ["s-1"] };

describe("shift preference changes say what they did", () => {
	it("confirms the person's own day", async () => {
		const { result } = renderHook(
			() => useReplaceMyPreferenceDay("c-1", "2026-11-16"),
			{ wrapper }
		);
		await act(async () => {
			await result.current.mutateAsync(day);
		});
		expect(await screen.findByRole("status")).toHaveTextContent(
			"Shift preferences saved."
		);
	});

	it("confirms a team member's day", async () => {
		const { result } = renderHook(
			() => useReplaceMemberPreferenceDay("c-1", "m-1", "2026-11-16"),
			{ wrapper }
		);
		await act(async () => {
			await result.current.mutateAsync(day);
		});
		expect(await screen.findByRole("status")).toHaveTextContent(
			"Shift preferences saved."
		);
	});
});
