import type { Faker } from "@faker-js/faker";

export interface Match {
	id: string;
	homeTeam: string;
	awayTeam: string;
	homeScore: number;
	awayScore: number;
	playedOn: string;
}

const createMatch = (faker: Faker): Match => ({
	id: faker.string.uuid(),
	homeTeam: faker.location.city(),
	awayTeam: faker.location.city(),
	homeScore: faker.number.int({ min: 0, max: 5 }),
	awayScore: faker.number.int({ min: 0, max: 5 }),
	playedOn: faker.date.recent({ days: 30 }).toISOString(),
});

/**
 * Stand-in for a real API call. Resolves with locally generated mock data so
 * the TanStack Query example works offline. Faker is loaded on first call so
 * it stays out of the page's bundle. Swap the body for a real `fetch` when
 * wiring up a backend.
 */
export const fetchMatches = async (count = 8): Promise<Array<Match>> => {
	const { faker } = await import("@faker-js/faker/locale/en");
	return Array.from({ length: count }, (): Match => createMatch(faker));
};
