// Keeps the unit-test quarantine visible and in one place: test-quarantine.json.
//
//   node scripts/check-test-quarantine.mjs            fail unless every skipped test is listed, and every listed test is skipped
//   node scripts/check-test-quarantine.mjs --summary  also print the list as a Markdown table (for $GITHUB_STEP_SUMMARY)
//
// A test counts as skipped when it is marked .skip, .todo, .fails, .skipIf or .runIf, or written xit / xtest /
// xdescribe. A .only is always refused (it silently skips every other test in its file), and so is a skipped .each
// (it hides every case at once).
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const QUARANTINE = join(ROOT, "test-quarantine.json");
const TEST_FILE = /\.test\.tsx?$/;
const TITLE = String.raw`\s*(["'\x60])((?:\\.|(?!\1).)*)\1`;
const SKIP_MARKER = new RegExp(
	String.raw`\b(?:it|test|describe)\.(?:skip|todo|fails)\(` + TITLE,
	"g"
);
const CONDITIONAL_MARKER = new RegExp(
	String.raw`\b(?:it|test|describe)\.(?:skipIf|runIf)\([^)]*\)\(` + TITLE,
	"g"
);
const X_MARKER = new RegExp(String.raw`\bx(?:it|test|describe)\(` + TITLE, "g");
const ONLY_MARKER = /\b(?:it|test|describe)\.only\b/;
const SKIPPED_EACH_MARKER =
	/\b(?:it|test|describe)\.(?:skip|todo|fails)\.each\b/;

/** Every test file under `directory`, as paths relative to the repository root. */
const testFiles = async (directory) => {
	const entries = await readdir(join(ROOT, directory), {
		recursive: true,
		withFileTypes: true,
	});
	return entries
		.filter((entry) => entry.isFile() && TEST_FILE.test(entry.name))
		.map((entry) => relative(ROOT, join(entry.parentPath, entry.name)));
};

/** The skipped test titles in one file's source, and the markers it may not hold. */
export const skippedTitles = (source) => {
	const titles = [SKIP_MARKER, CONDITIONAL_MARKER, X_MARKER].flatMap((marker) =>
		[...source.matchAll(marker)].map((match) => match[2])
	);
	return {
		titles,
		hasOnly: ONLY_MARKER.test(source),
		hasSkippedEach: SKIPPED_EACH_MARKER.test(source),
	};
};

/** The problems between the skipped tests found and the quarantine list. */
export const compare = (skipped, listed) => {
	const key = ({ file, test }) => `${file} > ${test}`;
	const listedKeys = new Set(listed.map(key));
	const skippedKeys = new Set(skipped.map(key));
	return [
		...skipped
			.filter((entry) => !listedKeys.has(key(entry)))
			.map((entry) => `skipped but not in test-quarantine.json: ${key(entry)}`),
		...listed
			.filter((entry) => !skippedKeys.has(key(entry)))
			.map((entry) => `in test-quarantine.json but not skipped: ${key(entry)}`),
		...listed
			.filter(
				(entry) =>
					typeof entry.reason !== "string" || entry.reason.trim() === ""
			)
			.map((entry) => `no reason given: ${key(entry)}`),
	];
};

/** The quarantine as a Markdown table. */
const summary = (listed) =>
	[
		`### Quarantined unit tests (${listed.length})`,
		"",
		listed.length === 0
			? "None."
			: [
					"| Test | Reason |",
					"| --- | --- |",
					...listed.map(
						({ file, test, reason }) =>
							`| \`${file}\` > ${test} | ${reason.replaceAll("|", "\\|")} |`
					),
				].join("\n"),
		"",
	].join("\n");

const main = async () => {
	const listed = JSON.parse(await readFile(QUARANTINE, "utf8")).tests;
	const skipped = [];
	const problems = [];
	for (const file of await testFiles("src")) {
		const { titles, hasOnly, hasSkippedEach } = skippedTitles(
			await readFile(join(ROOT, file), "utf8")
		);
		if (hasOnly) problems.push(`.only is not allowed: ${file}`);
		if (hasSkippedEach)
			problems.push(
				`a skipped .each hides every case; quarantine single tests: ${file}`
			);
		skipped.push(...titles.map((test) => ({ file, test })));
	}
	problems.push(...compare(skipped, listed));

	if (process.argv.includes("--summary")) console.log(summary(listed));
	if (problems.length > 0) {
		console.error(`test quarantine:\n  ${problems.join("\n  ")}`);
		process.exit(1);
	}
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
