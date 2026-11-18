import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";
import { PublishScheduleDialog } from "@/features/scheduling/schedules/PublishScheduleDialog";

/** Opens the publish dialog, in one step, for one schedule. */
const renderDialog = (schedule: Schedule): void => {
	const client = new QueryClient();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<PublishScheduleDialog
					companyId="c-1"
					schedule={schedule}
					onClose={() => {}}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
};

it("says a part of a week becomes final for its own days", () => {
	renderDialog(
		generatedScheduleFixture({
			status: "GENERATED",
			coveredFrom: "2026-10-14",
			coveredTo: "2026-10-16",
		})
	);

	expect(
		screen.getByRole("dialog", { name: "Publish this roster?" })
	).toHaveTextContent(
		/Publishing makes this roster final for its days \(Oct 14\s?–\s?16, 2026\)\. It can’t be regenerated/
	);
});

it("says a whole-week schedule becomes final for its week", () => {
	renderDialog(generatedScheduleFixture({ status: "GENERATED" }));

	expect(
		screen.getByRole("dialog", { name: "Publish this roster?" })
	).toHaveTextContent(
		"Publishing makes this roster final for its week. It can’t be regenerated"
	);
});
