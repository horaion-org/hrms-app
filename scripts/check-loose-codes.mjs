// Keeps the API's refusal codes named in one place per feature: its refusal module.
//
//   node scripts/check-loose-codes.mjs   fail on production code outside a refusal module that spells a refusal
//                                        code by hand, unless the file is listed below, and on a listed file that
//                                        no longer does (so the list only shrinks)
//
// A refusal code is spelt by hand when the code compares `errorCode` with a string (`errorCode === "…"`), looks a
// table up by it (`TABLE[error.errorCode]`), or writes a "<status> <CODE>" key such as "409 SKILL_NOT_FOUND".
// Refusal modules are `*Refusal.ts`, `refusals.ts` and `refusalFor.ts`, plus src/common's problem.ts,
// api-client.ts and refusal.ts, which read the codes every feature shares.
import { fileURLToPath } from "node:url";
import { isProduction, readSourceFiles, reportProblems } from "./sourceTree.mjs";

const REFUSAL_MODULE = /(Refusal\.ts|\/refusals\.ts|\/refusalFor\.ts)$/;
const COMMON_REFUSAL_MODULES = [
	"src/common/problem.ts",
	"src/common/api-client.ts",
	"src/common/refusal.ts",
];
const LOOSE_CODE_PATTERNS = [
	/errorCode\s*[!=]==?\s*["'`]/,
	/\[\s*[\w.?]*errorCode\s*\]/,
	/["'][1-5]\d\d [A-Z][A-Z0-9_]*["']/,
];

/**
 * Files that still spell refusal codes by hand. This list only shrinks: move the codes into the feature's
 * `<area>Refusal.ts` (through `mapRefusal` in src/common/refusal.ts), then delete the file's line. Never add one.
 */
const ALLOWED_LOOSE_CODES = [
	"src/features/auth/api.ts",
	"src/features/auth/session.ts",
	"src/features/employmentTerms/BulkChangeEmploymentTermsDialog/BulkChangeEmploymentTermsDialog.tsx",
	"src/features/people/notes.ts",
	"src/features/people/skills.ts",
	"src/features/scheduling/ScheduleMenu/ScheduleMenu.tsx",
	"src/features/scheduling/cover/engineRepairWords.ts",
	"src/features/scheduling/rulesCheck/rosterRulesCheckWords.ts",
	"src/features/settings/DataSettings/DataSettings.tsx",
	"src/features/settings/LeaveDurationsSettings/LeaveDurationsSettings.tsx",
	"src/features/settings/LeaveTypesSettings/LeaveTypesSettings.tsx",
	"src/features/settings/SchedulingPolicySettings/SchedulingPolicySettings.tsx",
	"src/features/skills/BulkAssignSkillDialog/BulkAssignSkillDialog.tsx",
	"src/pages/Skills.tsx",
	"src/routes/_authenticated.ts",
];

/** Whether a path is a refusal module, where refusal codes belong. */
export const isRefusalModule = (path) =>
	REFUSAL_MODULE.test(path) || COMMON_REFUSAL_MODULES.includes(path);

/** Whether a file is production code outside a refusal module that spells a refusal code by hand. */
export const spellsLooseCodes = (path, source) =>
	isProduction(path) &&
	!isRefusalModule(path) &&
	LOOSE_CODE_PATTERNS.some((pattern) => pattern.test(source));

/** The problems between the files found and the allowed list. */
export const compare = (found, allowed) => [
	...found
		.filter((path) => !allowed.includes(path))
		.map(
			(path) =>
				`${path} spells a refusal code by hand: name the code once in the feature's <area>Refusal.ts (through mapRefusal in src/common/refusal.ts) and import what it gives`
		),
	...allowed
		.filter((path) => !found.includes(path))
		.map(
			(path) =>
				`no longer spells a refusal code, delete it from ALLOWED_LOOSE_CODES: ${path}`
		),
];

const main = async () => {
	const files = await readSourceFiles("src");
	const found = files
		.filter(({ path, source }) => spellsLooseCodes(path, source))
		.map(({ path }) => path);
	reportProblems("loose refusal codes", compare(found, ALLOWED_LOOSE_CODES));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
