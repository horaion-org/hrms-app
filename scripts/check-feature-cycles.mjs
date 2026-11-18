// Keeps features, and the areas inside features/scheduling, from importing each other both ways.
//
//   node scripts/check-feature-cycles.mjs   fail on two features (or two scheduling areas) that import each other,
//                                           unless the pair is listed below, and on a listed pair that no longer
//                                           does (so the lists only shrink); and on an entry at the top of
//                                           features/scheduling that SCHEDULING_TOP_LEVEL does not list
//
// Reads the `@/features/<name>` imports of every source file under src/features, and the
// `@/features/scheduling/<area>/` imports of every source file inside a scheduling area, leaving out tests and
// stories. An area is a lowercase folder of features/scheduling, such as `roster` or `constraints`.
// eslint's import/no-cycle cannot do this here: it checks file cycles, not feature pairs, and eslint-plugin-import
// 2.32 cannot read TypeScript dependencies under ESLint 10.
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	isProduction,
	readSourceFiles,
	reportProblems,
	ROOT,
} from "./sourceTree.mjs";

const FEATURES_FOLDER = "src/features/";
const SCHEDULING_FOLDER = "src/features/scheduling/";
const FEATURE_IMPORT = /(?:from|import\()\s*["']@\/features\/([A-Za-z]+)/g;
const AREA_IMPORT =
	/(?:from|import\()\s*["']@\/features\/scheduling\/([a-z][A-Za-z]*)\//g;
const AREA_FOLDER = /^[a-z][A-Za-z]*$/;

/**
 * Pairs of features that still import each other both ways, alphabetical within each pair. This list only shrinks:
 * break a pair, then delete its line. Never add one; move the shared code to `src/common` or to the feature that
 * owns it.
 */
const ALLOWED_PAIRS = [
	"employmentTerms<->people",
	"imports<->organisation",
	"imports<->people",
	"organisation<->workspace",
	"people<->skills",
	"people<->workspace",
];

/**
 * Pairs of scheduling areas that still import each other both ways, alphabetical within each pair. This list only
 * shrinks: break a pair, then delete its line. Never add one; move the shared code to the area that owns it, or to a
 * file at the top of features/scheduling (as `paths.ts` and `periods.ts` are).
 */
const ALLOWED_AREA_PAIRS = [
	"constraints<->schedules",
	"constraints<->shifts",
	"cover<->coverOffers",
	"coverOffers<->roster",
	"dates<->months",
	"dates<->schedules",
	"dates<->startingContext",
	"hours<->startingContext",
	"months<->schedules",
	"roster<->rosterChanges",
	"roster<->rulesCheck",
	"roster<->schedules",
	"schedules<->shifts",
];

/**
 * Everything at the top of features/scheduling: its areas (the lowercase folders), the files every area shares, the
 * page tests, and the entries that stay because areas on both sides read them (src/features/scheduling/README.md,
 * "Map"). Anything else goes into the area that owns it; a new area is added here.
 */
const SCHEDULING_TOP_LEVEL = [
	"constraints",
	"cover",
	"coverOffers",
	"createSchedule",
	"dates",
	"departmentSetup",
	"hours",
	"months",
	"myRoster",
	"policy",
	"preferenceOutcomes",
	"publishedWeek",
	"readiness",
	"roster",
	"rosterChanges",
	"rulesCheck",
	"schedules",
	"shifts",
	"startingContext",
	"timeline",
	"README.md",
	"paths.ts",
	"periods.ts",
	"periods.test.ts",
	"dayTypes.ts",
	"dayTypes.test.ts",
	"schedulingSearch.ts",
	"schedulingSearch.test.ts",
	"CreateMonthSchedule.test.tsx",
	"CreateSchedule.test.tsx",
	"MyRoster.test.tsx",
	"ScheduleDetail.test.tsx",
	"ScheduleMonth.test.tsx",
	"DepartmentSchedule.test.tsx",
	"Scheduling.test.tsx",
	"scheduleDraft.ts",
	"scheduleDraft.test.ts",
	"weekChoice.ts",
	"weekChoice.test.ts",
	"steps.ts",
	"setupReach.ts",
	"setupReach.test.ts",
	"WeekChoiceSummary",
	"RosterSidePanel",
	"RosterCellPanel",
];

/** How the feature check words its problems: what it pairs, the list it reads, what to do about a new pair. */
export const FEATURE_RULE = {
	things: "features",
	listName: "ALLOWED_PAIRS",
	remedy: "move the shared code to src/common or to the feature that owns it",
};

/** How the scheduling area check words its problems. */
export const AREA_RULE = {
	things: "scheduling areas",
	listName: "ALLOWED_AREA_PAIRS",
	remedy:
		"move the shared code to the area that owns it, or to a file at the top of features/scheduling",
};

/** The features a source file imports. */
export const importedFeatures = (source) =>
	new Set([...source.matchAll(FEATURE_IMPORT)].map((match) => match[1]));

/** The scheduling areas a source file imports. */
export const importedAreas = (source) =>
	new Set([...source.matchAll(AREA_IMPORT)].map((match) => match[1]));

/** The feature a path under src/features belongs to. */
export const featureOf = (path) =>
	path.slice(FEATURES_FOLDER.length).split("/")[0];

/** The scheduling area a path belongs to, or undefined for a file outside every area. */
export const areaOf = (path) => {
	if (!path.startsWith(SCHEDULING_FOLDER)) return undefined;
	const segments = path.slice(SCHEDULING_FOLDER.length).split("/");
	const isInsideFolder = segments.length > 1;
	return isInsideFolder && AREA_FOLDER.test(segments[0])
		? segments[0]
		: undefined;
};

/**
 * Which groups each group's files import, other than itself. `groupOf` names a file's group (a feature, an area),
 * or undefined to skip the file; `importedGroups` reads the groups a file's source imports.
 */
export const importsByGroup = (files, groupOf, importedGroups) => {
	const imports = new Map();
	for (const { path, source } of files) {
		const group = groupOf(path);
		if (group === undefined) continue;
		const targets = imports.get(group) ?? new Set();
		for (const target of importedGroups(source))
			if (target !== group) targets.add(target);
		imports.set(group, targets);
	}
	return imports;
};

/** Every pair that import each other, as "a<->b" with a before b. */
export const bidirectionalPairs = (imports) => {
	const pairs = new Set();
	for (const [from, targets] of imports)
		for (const to of targets)
			if (from < to && imports.get(to)?.has(from)) pairs.add(`${from}<->${to}`);
	return [...pairs].sort();
};

/** The problems between the pairs found and the allowed list, worded by the rule. */
export const compare = (found, allowed, rule) => [
	...found
		.filter((pair) => !allowed.includes(pair))
		.map((pair) => `${rule.things} import each other: ${pair}; ${rule.remedy}`),
	...allowed
		.filter((pair) => !found.includes(pair))
		.map((pair) => `no longer a cycle, delete it from ${rule.listName}: ${pair}`),
];

/** The problems between the entries at the top of features/scheduling and the listed ones. */
export const topLevelProblems = (entries, listed) => [
	...entries
		.filter((entry) => !listed.includes(entry))
		.map(
			(entry) =>
				`${SCHEDULING_FOLDER}${entry} is not listed in SCHEDULING_TOP_LEVEL: move it into the area that owns it (src/features/scheduling/README.md, "Map"), or list a new area there`
		),
	...listed
		.filter((entry) => !entries.includes(entry))
		.map(
			(entry) =>
				`no longer at the top of features/scheduling, delete it from SCHEDULING_TOP_LEVEL: ${entry}`
		),
];

const main = async () => {
	const files = (await readSourceFiles("src/features")).filter(({ path }) =>
		isProduction(path)
	);
	const problems = [
		...compare(
			bidirectionalPairs(importsByGroup(files, featureOf, importedFeatures)),
			ALLOWED_PAIRS,
			FEATURE_RULE
		),
		...compare(
			bidirectionalPairs(importsByGroup(files, areaOf, importedAreas)),
			ALLOWED_AREA_PAIRS,
			AREA_RULE
		),
		...topLevelProblems(
			await readdir(join(ROOT, SCHEDULING_FOLDER)),
			SCHEDULING_TOP_LEVEL
		),
	];
	reportProblems("feature cycles", problems);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
