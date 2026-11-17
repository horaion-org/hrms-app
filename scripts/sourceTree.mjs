// The source files the structure checks read: every TypeScript file under a folder, with its text.
import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** The repository root, the folder above scripts/. */
export const ROOT = fileURLToPath(new URL("..", import.meta.url));

const SOURCE_FILE = /\.tsx?$/;
const TEST_FILE = /\.test\.tsx?$/;
const STORY_FILE = /\.stories\.tsx?$/;

/** Whether a path names a unit test file. */
export const isTest = (path) => TEST_FILE.test(path);

/** Whether a path names a Storybook story file. */
export const isStory = (path) => STORY_FILE.test(path);

/** Whether a path names production code: neither a test nor a story. */
export const isProduction = (path) => !isTest(path) && !isStory(path);

/** A path relative to the repository root, with forward slashes on every platform. */
const repositoryPath = (absolutePath) =>
	relative(ROOT, absolutePath).split(sep).join("/");

/**
 * Every `.ts` and `.tsx` file under `folder` (relative to the repository root), as `{ path, source }` with `path`
 * relative to the root, such as `src/common/weeks.ts`.
 */
export const readSourceFiles = async (folder) => {
	const entries = await readdir(join(ROOT, folder), {
		recursive: true,
		withFileTypes: true,
	});
	const paths = entries
		.filter((entry) => entry.isFile() && SOURCE_FILE.test(entry.name))
		.map((entry) => repositoryPath(join(entry.parentPath, entry.name)))
		.sort();
	return Promise.all(
		paths.map(async (path) => ({
			path,
			source: await readFile(join(ROOT, path), "utf8"),
		}))
	);
};

/** Prints the problems under a heading and fails the process when there are any. */
export const reportProblems = (heading, problems) => {
	if (problems.length === 0) return;
	console.error(`${heading}:\n  ${problems.join("\n  ")}`);
	process.exit(1);
};
