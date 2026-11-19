import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { DeleteScheduleDialog } from "@/features/scheduling/schedules/DeleteScheduleDialog";
import { scheduleFixture } from "@/features/scheduling/schedules/fixtures";

/** Opens the delete dialog for one schedule, with no other parts known. */
const renderDialog = (schedule: Schedule): void => {
	const client = new QueryClient();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<DeleteScheduleDialog
					companyId="c-1"
					schedule={schedule}
					onClose={() => {}}
					onDeleted={() => {}}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
};

it("names only the days a part of a week covers", () => {
	renderDialog(
		scheduleFixture({ coveredFrom: "2026-10-14", coveredTo: "2026-10-16" })
	);

	expect(
		screen.getByRole("dialog", {
			name: /^Delete the Front Office roster for Oct 14\s?–\s?16, 2026\?$/,
		})
	).toHaveTextContent(
		/This removes the Front Office roster for Oct 14\s?–\s?16, 2026 from the roster page\. A roster that was generated is kept in History, where you can open it and put it back while its days are still free\./
	);
});

it("names the whole week for a schedule that covers its week", () => {
	renderDialog(scheduleFixture());

	expect(
		screen.getByRole("dialog", {
			name: /^Delete the Front Office roster for Oct 12\s?–\s?18, 2026\?$/,
		})
	).toHaveTextContent(
		/This removes the Front Office roster for Oct 12\s?–\s?18, 2026 from the roster page\. A roster that was generated is kept in History, where you can open it and put it back while its days are still free\./
	);
});
