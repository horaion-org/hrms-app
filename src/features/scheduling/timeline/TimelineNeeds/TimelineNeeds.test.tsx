import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { TimelineNeeds } from "@/features/scheduling/timeline/TimelineNeeds";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

describe("TimelineNeeds", () => {
	/** Review shows the schedule alone; open days link to Create schedule by dates. */
	it("gives each line its one action", async () => {
		const onReview = vi.fn();
		render(
			<MemoryRouterHarness>
				<TimelineNeeds
					mayCreate
					departmentId="d-1"
					lines={[
						{ kind: "reviewOne", scheduleId: "s-late", name: "Weekend" },
						{
							kind: "noSchedule",
							firstDay: "2027-02-11",
							lastDay: "2027-02-11",
						},
					]}
					onReview={onReview}
				/>
			</MemoryRouterHarness>
		);
		expect(
			await screen.findByText("Weekend is ready to review.")
		).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Review" }));
		expect(onReview).toHaveBeenCalledWith("s-late");
		expect(
			screen.getByRole("link", { name: "Create schedule" })
		).toHaveAttribute("href", expect.stringContaining("firstDay=2027-02-11"));
	});
});
