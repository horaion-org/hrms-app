import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { DayRun } from "@/features/scheduling/dates/api";
import { scheduleFixture } from "@/features/scheduling/schedules/fixtures";
import { RegenerateScheduleDialog } from "@/features/scheduling/schedules/RegenerateScheduleDialog";

/** Shows the dialog for a part of its week covering `days`. */
const showForPart = (days: DayRun): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={new QueryClient()}>
				<RegenerateScheduleDialog
					companyId="c-1"
					schedule={scheduleFixture()}
					regeneration={{
						path: "ownRoute",
						days,
						partOfWeek: true,
						oncePublished: false,
						offered: true,
					}}
					onClose={vi.fn()}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
};

describe("RegenerateScheduleDialog", () => {
	it.each([
		[
			"one day",
			{ from: "2027-08-02", to: "2027-08-02" },
			/^Aug 2, 2027 is worked out again\./,
		],
		[
			"several days",
			{ from: "2027-08-02", to: "2027-08-04" },
			/^Aug 2\s?–\s?4, 2027 are worked out again\./,
		],
	])(
		"given_aPartOf_%s_when_shown_then_theVerbAgreesWithItsDays",
		(_, days, line) => {
			showForPart(days);

			expect(screen.getByText(line)).toBeInTheDocument();
		}
	);
});
