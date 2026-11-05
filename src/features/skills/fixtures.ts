import type { MemberSkill } from "@/features/people/api";
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

/** A holding as a person's skills list it: rated 1 to 10, without notes or dates, unless overridden. */
export const heldSkillFixture = (
	overrides: Partial<MemberSkill> = {}
): MemberSkill => ({
	skillId: "skill-forklift",
	name: "Forklift",
	category: "Equipment",
	proficiencyScale: "ONE_TO_TEN",
	tracksExpiry: false,
	validityMonths: null,
	skillStatus: "ACTIVE",
	proficiency: 8,
	notes: null,
	issuedOn: null,
	expiresOn: null,
	...overrides,
});

/** A held licence: not rated, valid until `expiresOn`. */
export const heldLicenceFixture = (
	overrides: Partial<MemberSkill> = {}
): MemberSkill =>
	heldSkillFixture({
		skillId: "skill-licence",
		name: "Security Officer Licence",
		category: "Licence",
		proficiencyScale: "NONE",
		tracksExpiry: true,
		validityMonths: 12,
		proficiency: null,
		issuedOn: "2026-03-01",
		expiresOn: "2027-02-28",
		...overrides,
	});
