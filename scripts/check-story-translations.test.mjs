// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	componentPathOf,
	missesTranslations,
	storyProblemsOf,
} from "./check-story-translations.mjs";

const TRANSLATED_COMPONENT =
	'const { t } = useTranslation();\nreturn <p>{t("a.b")}</p>;';
const STORY_PATH = "src/components/ui/Badge/Badge.stories.tsx";
const COMPONENT_PATH = "src/components/ui/Badge/Badge.tsx";

describe("componentPathOf", () => {
	it("names the component file beside the story", () => {
		expect(componentPathOf(STORY_PATH)).toBe(COMPONENT_PATH);
	});
});

describe("missesTranslations", () => {
	it("flags a story of a translated component that loads nothing", () => {
		expect(missesTranslations('import { Badge } from "./x";', TRANSLATED_COMPONENT)).toBe(
			true
		);
	});

	it.each([
		['import "@/common/i18n";', "the app's i18n"],
		["decorators: [storyProviders(client)]", "the shared story providers"],
		["<I18nextProvider i18n={instance}>", "its own provider"],
	])("passes a story that loads %s (%s)", (storySource) => {
		expect(missesTranslations(storySource, TRANSLATED_COMPONENT)).toBe(false);
	});

	it("passes a story whose component does not translate", () => {
		expect(missesTranslations("", "return <p>Plain</p>;")).toBe(false);
	});
});

describe("storyProblemsOf", () => {
	it("names the story and what to do", () => {
		const files = [
			{ path: STORY_PATH, source: "" },
			{ path: COMPONENT_PATH, source: TRANSLATED_COMPONENT },
		];

		expect(storyProblemsOf(files)).toEqual([
			'src/components/ui/Badge/Badge.stories.tsx shows raw translation keys: its component calls useTranslation but the story loads no translations. Add import "@/common/i18n"; after its imports',
		]);
	});

	it("skips a story with no component file beside it", () => {
		expect(
			storyProblemsOf([{ path: "src/components/ui/Icon/Icon.stories.tsx", source: "" }])
		).toEqual([]);
	});
});
