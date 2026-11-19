// Keeps every story of a translated component showing the real copy, not raw keys.
//
//   node scripts/check-story-translations.mjs   fail on a story whose component calls useTranslation while the
//                                               story loads no translations
//
// A story is `X.stories.tsx`; its component is `X.tsx` in the same folder. The story loads translations when it
// imports `@/common/i18n` or wraps itself in an i18n provider (`storyProviders` from
// `@/features/organisation/storyApi`, or its own `I18nextProvider`). There are no exceptions.
import { fileURLToPath } from "node:url";
import { isStory, readSourceFiles, reportProblems } from "./sourceTree.mjs";

const STORY_SUFFIX = /\.stories\.tsx$/;
const COMPONENT_SUFFIX = ".tsx";
const USES_TRANSLATIONS = /\buseTranslation\(/;
const LOADS_TRANSLATIONS =
	/["']@\/common\/i18n["']|\bstoryProviders\b|\bI18nextProvider\b/;

/** The path of the component a story shows: `X.stories.tsx` shows `X.tsx`. */
export const componentPathOf = (storyPath) =>
	storyPath.replace(STORY_SUFFIX, COMPONENT_SUFFIX);

/** Whether a story shows raw keys: its component translates and the story loads no translations. */
export const missesTranslations = (storySource, componentSource) =>
	USES_TRANSLATIONS.test(componentSource) &&
	!LOADS_TRANSLATIONS.test(storySource);

/** The problem for each story that shows raw keys. */
export const storyProblemsOf = (files) => {
	const sourceByPath = new Map(files.map(({ path, source }) => [path, source]));
	return files
		.filter(({ path }) => isStory(path))
		.filter(({ path, source }) => {
			const componentSource = sourceByPath.get(componentPathOf(path));
			return (
				componentSource !== undefined &&
				missesTranslations(source, componentSource)
			);
		})
		.map(
			({ path }) =>
				`${path} shows raw translation keys: its component calls useTranslation but the story loads no translations. Add import "@/common/i18n"; after its imports`
		);
};

const main = async () => {
	reportProblems(
		"story translations",
		storyProblemsOf(await readSourceFiles("src"))
	);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
