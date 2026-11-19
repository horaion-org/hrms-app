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

/** Renders two days to review and one free day, for someone who may create, with `onPublish` when given. */
const renderNeeds = (
	onPublish?: (scheduleIds: ReadonlyArray<string>) => void
): void => {
	render(
		<MemoryRouterHarness>
			<TimelineNeeds
				mayCreate
				departmentId="d-1"
				lines={[
					{
						kind: "toReview",
						firstDay: "2027-02-12",
						lastDay: "2027-02-13",
						scheduleIds: ["s-late"],
					},
					{
						kind: "noSchedule",
						schedulable: true,
						firstDay: "2027-02-11",
						lastDay: "2027-02-11",
					},
					{
						kind: "noSchedule",
						schedulable: false,
						firstDay: "2027-02-14",
						lastDay: "2027-02-14",
					},
				]}
				onPublish={onPublish}
			/>
		</MemoryRouterHarness>
	);
};

describe("TimelineNeeds", () => {
	/** Publish names the schedules holding the days; a free day links to Generate by dates; a blocked day has no action. */
	it("gives each line its one action", async () => {
		const onPublish = vi.fn();
		renderNeeds(onPublish);
		expect(
			await screen.findByText(
				/^Feb 12\s?–\s?13, 2027 are to review\. Staff can't see them yet\.$/
			)
		).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Publish" }));
		expect(onPublish).toHaveBeenCalledWith(["s-late"]);
		expect(screen.getByText("Feb 11, 2027 has no roster.")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Generate" })).toHaveAttribute(
			"href",
			expect.stringContaining("firstDay=2027-02-11")
		);
		expect(
			screen.getByText(
				"No schedule for Feb 14, 2027. Days before a published schedule in the same week cannot be scheduled."
			)
		).toBeInTheDocument();
		expect(screen.getAllByRole("link")).toHaveLength(1);
	});

	/** Without the publish key the page passes no `onPublish`, so the days are named with no button. */
	it("offers no Publish to someone who may not publish", async () => {
		renderNeeds();
		expect(await screen.findByText(/are to review/)).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Publish" })
		).not.toBeInTheDocument();
	});
});
