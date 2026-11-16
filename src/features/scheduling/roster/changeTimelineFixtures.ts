import type { ChangeDay } from "@/features/scheduling/roster/changeTimeline";

/** Two days of hand changes, newest first, for stories and tests; never sent anywhere. */
export const changeDaysFixture = (): Array<ChangeDay> => [
	{
		appliedOn: "2026-11-16",
		label: "Mon, 16 Nov",
		entries: [
			{
				key: "a-1",
				title: "Aisha Rahman · Mon, 12 Oct",
				byline: "Changed 10:40 by Rosa Lind",
				before: "Day off",
				after: "Front Desk AM · 09:00 – 15:00",
			},
		],
	},
	{
		appliedOn: "2026-11-15",
		label: "Sun, 15 Nov",
		entries: [
			{
				key: "a-2",
				title: "Ben Ong · Tue, 13 Oct",
				byline: "Changed 17:05",
				before: "Swing Shift · 14:00 – 22:00",
				after: "Rest day",
			},
		],
	},
];
