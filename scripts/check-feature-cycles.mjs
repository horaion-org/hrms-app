// Keeps features from importing each other both ways.
//
//   node scripts/check-feature-cycles.mjs   fail on two features that import each other, unless the pair is listed
//                                           below, and on a listed pair that no longer does (so the list only shrinks)
//
// Reads the `@/features/<name>` imports of every source file under src/features, leaving out tests and stories.
// eslint's import/no-cycle cannot do this here: it checks file cycles, not feature pairs, and eslint-plugin-import
// 2.32 cannot read TypeScript dependencies under ESLint 10.
import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FEATURES = join(ROOT, "src", "features");
const SOURCE_FILE = /\.tsx?$/;
const TEST_OR_STORY = /\.(test|stories)\.tsx?$/;
const FEATURE_IMPORT = /(?:from|import\()\s*["']@\/features\/([A-Za-z]+)/g;

/**
 * Pairs that still import each other both ways, alphabetical within each pair. This list only shrinks: break a
 * pair, then delete its line. Never add one; move the shared code to `src/common` or to the feature that owns it.
 */
const ALLOWED_PAIRS = [
	"employmentTerms<->people",
	"imports<->organisation",
	"imports<->people",
	"organisation<->workspace",
	"people<->skills",
	"people<->workspace",
];

/** The features a source file imports. */
export const importedFeatures = (source) =>
	new Set([...source.matchAll(FEATURE_IMPORT)].map((match) => match[1]));

/** Every pair of features that import each other, as "a<->b" with a before b. */
export const bidirectionalPairs = (imports) => {
	const pairs = new Set();
	for (const [from, targets] of imports)
		for (const to of targets)
			if (from < to && imports.get(to)?.has(from)) pairs.add(`${from}<->${to}`);
	return [...pairs].sort();
};

/** The problems between the pairs found and the allowed list. */
export const compare = (found, allowed) => [
	...found
		.filter((pair) => !allowed.includes(pair))
		.map((pair) => `features import each other: ${pair}`),
	...allowed
		.filter((pair) => !found.includes(pair))
		.map((pair) => `no longer a cycle, delete it from ALLOWED_PAIRS: ${pair}`),
];

/** Which features each feature's source files import, other than itself. */
const featureImports = async () => {
	const entries = await readdir(FEATURES, {
		recursive: true,
		withFileTypes: true,
	});
	const imports = new Map();
	for (const entry of entries) {
		if (
			!entry.isFile() ||
			!SOURCE_FILE.test(entry.name) ||
			TEST_OR_STORY.test(entry.name)
		)
			continue;
		const path = join(entry.parentPath, entry.name);
		const feature = relative(FEATURES, path).split(sep)[0];
		const targets = imports.get(feature) ?? new Set();
		for (const target of importedFeatures(await readFile(path, "utf8")))
			if (target !== feature) targets.add(target);
		imports.set(feature, targets);
	}
	return imports;
};

const main = async () => {
	const problems = compare(
		bidirectionalPairs(await featureImports()),
		ALLOWED_PAIRS
	);
	if (problems.length > 0) {
		console.error(`feature cycles:\n  ${problems.join("\n  ")}`);
		process.exit(1);
	}
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
