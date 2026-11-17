// Keeps imports pointing one way, routes → pages → features → components → common, and into a component folder
// only through its index.ts.
//
//   node scripts/check-import-direction.mjs   fail on an import that points up a layer or reaches past a component
//                                             folder's index.ts, unless listed below, and on a listed exception that
//                                             is no longer needed (so the lists only shrink)
//
// Reads the `@/…` and relative imports of every file under src. A component folder is a folder that holds an
// index.ts; only the outermost one on an import's path counts, so a compound component's own sub-folders may share
// files (Tabs/Tab reads Tabs/Tabs/Tabs.context).
import { dirname, join } from "node:path/posix";
import { fileURLToPath } from "node:url";
import { isProduction, readSourceFiles, reportProblems } from "./sourceTree.mjs";

const IMPORT_PATH = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
const INDEX_FILE = /\/index\.tsx?$/;
const SOURCE_FOLDER = "src/";
const ALIAS = "@/";

/**
 * What each layer may not import. `checksTestsAndStories` is false for features, whose page tests render the page
 * they cover; the lower layers' tests and stories are held to the rule too.
 */
const LAYER_RULES = [
	{
		layer: "src/common/",
		forbidden: [
			"@/features/",
			"@/pages/",
			"@/routes/",
			"@/routeTree.gen",
			"@/components/",
		],
		checksTestsAndStories: true,
		remedy:
			"src/common sits below every layer; move the code that needs it out of src/common, or pass the value in",
	},
	{
		layer: "src/components/",
		forbidden: ["@/features/", "@/pages/", "@/routes/", "@/routeTree.gen"],
		checksTestsAndStories: true,
		remedy:
			"a shared component knows no feature; pass the value in as a prop, or move the helper to src/common",
	},
	{
		layer: "src/features/",
		forbidden: ["@/pages/", "@/routes/", "@/routeTree.gen"],
		checksTestsAndStories: false,
		remedy:
			"a feature never reaches up to a page or a route; move the shared code into the feature and import it from the page",
	},
];

/**
 * Files that still import up a layer. This list only shrinks: fix the import, then delete its line. Never add one.
 * The components entries are tests and stories that load `@/features/auth/testingI18n`; they go when it moves to
 * src/common/testing.
 */
const ALLOWED_UPWARD_IMPORTERS = [
	"src/common/SuccessNotifications.tsx",
	"src/common/testing/effectiveWorkspace.ts",
	"src/common/testing/openApp.ts",
	"src/components/forms/DatePicker/DatePicker.stories.tsx",
	"src/components/forms/DatePicker/DatePicker.test.tsx",
	"src/components/forms/DaysMultiSelect/DaysMultiSelect.test.tsx",
	"src/components/forms/TimeSelect/TimeSelect.test.tsx",
	"src/components/layout/Sidebar/HoraionLogo/HoraionLogo.test.tsx",
	"src/components/layout/Sidebar/Sidebar/Sidebar.test.tsx",
	"src/components/ui/CopyButton/CopyButton.test.tsx",
	"src/components/ui/DaySwitcher/DaySwitcher.stories.tsx",
	"src/components/ui/DaySwitcher/DaySwitcher.test.tsx",
	"src/components/ui/Pagination/Pagination.stories.tsx",
	"src/components/ui/Pagination/Pagination.test.tsx",
	"src/components/ui/WeekGrid/WeekGrid/WeekGrid.stories.tsx",
	"src/components/ui/WeekGrid/WeekGrid/WeekGrid.test.tsx",
	"src/components/ui/WeekNavigator/WeekNavigator.stories.tsx",
	"src/components/ui/WeekNavigator/WeekNavigator.test.tsx",
];

/**
 * Modules production code still imports from inside another component folder. This list only shrinks: export the
 * module from its folder's index.ts (or move it out of the folder), then delete its line. Never add one.
 */
const ALLOWED_DEEP_IMPORTS = [
	"@/components/forms/Combobox/Token",
	"@/features/approvals/ApprovalFlowDialog/schema",
	"@/features/leave/LeaveRequestDialog/RosteredDaysNotice",
	"@/features/organisation/PermissionChecklist/groups",
	"@/features/scheduling/FindingList/findingToneIcons",
	"@/features/scheduling/RosterCellPanel/CellPanelFooter",
	"@/features/scheduling/RosterDayNotes/leaveLinkSearch",
	"@/features/scheduling/ScheduleSetupStep/chosenDepartment",
	"@/features/scheduling/constraints/ConstraintDialog/typeGroups",
	"@/features/scheduling/coverOffers/CoverOfferActions/CoverOfferSent",
	"@/features/settings/LeaveTypesSettings/useMovedArrowFocus",
];

/** A `src/…` path as the `@/…` alias names it. */
const aliasOf = (path) => ALIAS + path.slice(SOURCE_FOLDER.length);

/** The `@/…` and relative imports in a file's source, each as an `@/…` path; package imports are left out. */
export const importPathsOf = (path, source) =>
	[...source.matchAll(IMPORT_PATH)]
		.map((match) => match[1])
		.filter(
			(importPath) => importPath.startsWith(ALIAS) || importPath.startsWith(".")
		)
		.map((importPath) =>
			importPath.startsWith(ALIAS)
				? importPath
				: aliasOf(join(dirname(path), importPath))
		);

/** Every component folder in the tree, as an `@/…` path: a folder that holds an index.ts or index.tsx. */
export const componentFoldersOf = (paths) =>
	new Set(paths.filter((path) => INDEX_FILE.test(path)).map((path) => aliasOf(dirname(path))));

/** The imports of one file that point up a layer, each with what to do instead. */
export const upwardImportsOf = (path, importPaths) => {
	const rule = LAYER_RULES.find(({ layer }) => path.startsWith(layer));
	if (rule === undefined) return [];
	if (!rule.checksTestsAndStories && !isProduction(path)) return [];
	return importPaths
		.filter((importPath) =>
			rule.forbidden.some((prefix) => importPath.startsWith(prefix))
		)
		.map((importPath) => ({ path, importPath, remedy: rule.remedy }));
};

/**
 * The outermost component folder an import reaches into past its index.ts, or undefined when it goes through the
 * index.ts or the importing file sits inside that folder.
 */
export const folderReachedPast = (path, importPath, componentFolders) => {
	const segments = importPath.split("/");
	for (let length = 2; length < segments.length; length++) {
		const folder = segments.slice(0, length).join("/");
		if (!componentFolders.has(folder)) continue;
		const isInsideFolder = aliasOf(path).startsWith(`${folder}/`);
		return isInsideFolder ? undefined : folder;
	}
	return undefined;
};

/** The imports of one production file that reach past a component folder's index.ts. */
export const deepImportsOf = (path, importPaths, componentFolders) =>
	isProduction(path)
		? importPaths
				.map((importPath) => ({
					path,
					importPath,
					folder: folderReachedPast(path, importPath, componentFolders),
				}))
				.filter(({ folder }) => folder !== undefined)
		: [];

/** The problems between the imports found and the two allowed lists. */
export const compare = (
	{ upwardImports, deepImports },
	{ allowedUpwardImporters, allowedDeepImports }
) => [
	...upwardImports
		.filter(({ path }) => !allowedUpwardImporters.includes(path))
		.map(
			({ path, importPath, remedy }) =>
				`${path} imports ${importPath}: ${remedy}`
		),
	...deepImports
		.filter(({ importPath }) => !allowedDeepImports.includes(importPath))
		.map(
			({ path, importPath, folder }) =>
				`${path} imports ${importPath}, past the index.ts of ${folder}: export it from that index.ts and import ${folder}, or move it out of the folder`
		),
	...allowedUpwardImporters
		.filter((allowed) => !upwardImports.some(({ path }) => path === allowed))
		.map(
			(allowed) =>
				`no longer imports up a layer, delete it from ALLOWED_UPWARD_IMPORTERS: ${allowed}`
		),
	...allowedDeepImports
		.filter(
			(allowed) => !deepImports.some(({ importPath }) => importPath === allowed)
		)
		.map(
			(allowed) =>
				`no longer imported past an index.ts, delete it from ALLOWED_DEEP_IMPORTS: ${allowed}`
		),
];

const main = async () => {
	const files = await readSourceFiles("src");
	const componentFolders = componentFoldersOf(files.map(({ path }) => path));
	const imports = files.map(({ path, source }) => ({
		path,
		importPaths: importPathsOf(path, source),
	}));
	const problems = compare(
		{
			upwardImports: imports.flatMap(({ path, importPaths }) =>
				upwardImportsOf(path, importPaths)
			),
			deepImports: imports.flatMap(({ path, importPaths }) =>
				deepImportsOf(path, importPaths, componentFolders)
			),
		},
		{
			allowedUpwardImporters: ALLOWED_UPWARD_IMPORTERS,
			allowedDeepImports: ALLOWED_DEEP_IMPORTS,
		}
	);
	reportProblems("import direction", problems);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
