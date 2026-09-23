import { faker } from "@faker-js/faker/locale/en";

export interface Match {
	id: string;
	homeTeam: string;
	awayTeam: string;
	homeScore: number;
	awayScore: number;
	playedOn: string;
}

const createMatch = (): Match => ({
	id: faker.string.uuid(),
	homeTeam: faker.location.city(),
	awayTeam: faker.location.city(),
	homeScore: faker.number.int({ min: 0, max: 5 }),
	awayScore: faker.number.int({ min: 0, max: 5 }),
	playedOn: faker.date.recent({ days: 30 }).toISOString(),
});

/**
 * Stand-in for a real API call. Resolves with locally generated mock data so
 * the TanStack Query example works offline. Swap the body for a real `fetch`
 * when wiring up a backend.
 */
export const fetchMatches = (count = 8): Promise<Array<Match>> => {
	return Promise.resolve(
		Array.from({ length: count }, (): Match => createMatch())
	);
};
