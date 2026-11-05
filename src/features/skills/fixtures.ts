import type { Skill, SkillOverview } from "@/features/skills/api";

/** A rated skill as the API sends it, for tests and stories. */
export const skillFixture = (overrides: Partial<Skill> = {}): Skill => ({
	skillId: "skill-forklift",
	name: "Forklift",
	category: "Equipment",
	description: "Counterbalance and reach trucks",
	proficiencyScale: "ONE_TO_TEN",
	tracksExpiry: false,
	validityMonths: null,
	status: "ACTIVE",
	createdAt: "2026-11-01T09:00:00Z",
	...overrides,
});

/** A licence: held, not rated, tracking expiry. */
export const licenceFixture = (overrides: Partial<Skill> = {}): Skill =>
	skillFixture({
		skillId: "skill-licence",
		name: "Security Officer Licence",
		category: "Licence",
		description: null,
		proficiencyScale: "NONE",
		tracksExpiry: true,
		validityMonths: 12,
		...overrides,
	});

/** A catalogue row with its holder counts. */
export const overviewFixture = (
	skill: Skill,
	counts: Partial<
		Pick<SkillOverview, "holders" | "expiringSoon" | "expired">
	> = {}
): SkillOverview => ({
	...skill,
	holders: 0,
	expiringSoon: 0,
	expired: 0,
	...counts,
});
