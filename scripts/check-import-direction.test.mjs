// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	compare,
	componentFoldersOf,
	deepImportsOf,
	folderReachedPast,
	importPathsOf,
	upwardImportsOf,
} from "./check-import-direction.mjs";

const NO_EXCEPTIONS = { allowedUpwardImporters: [], allowedDeepImports: [] };
const DIALOG_FOLDER = "@/features/people/NoteDialog";
const COMPONENT_FOLDERS = new Set([
	DIALOG_FOLDER,
	"@/features/people/NoteDialog/NoteBody",
	"@/components/ui/Tabs",
]);

describe("importPathsOf", () => {
	it("reads named, side-effect and dynamic imports, as @/ paths", () => {
		const source = [
			'import { a } from "@/common/weeks";',
			'import "@/common/i18n";',
			'const page = await import("@/pages/Leave");',
		].join("\n");

		expect(importPathsOf("src/features/leave/x.ts", source)).toEqual([
			"@/common/weeks",
			"@/common/i18n",
			"@/pages/Leave",
		]);
	});

	it("resolves a relative import from the importing file's folder", () => {
		const source = 'import { b } from "../shared/b";';

		expect(importPathsOf("src/features/leave/Dialog/Dialog.tsx", source)).toEqual(
			["@/features/leave/shared/b"]
		);
	});

	it("leaves out package imports", () => {
		expect(importPathsOf("src/common/x.ts", 'import { z } from "zod";')).toEqual(
			[]
		);
	});
});

describe("componentFoldersOf", () => {
	it("names every folder that holds an index file", () => {
		const paths = [
			"src/components/ui/Badge/index.ts",
			"src/components/ui/Badge/Badge.tsx",
			"src/features/people/api.ts",
		];

		expect([...componentFoldersOf(paths)]).toEqual(["@/components/ui/Badge"]);
	});
});

describe("upwardImportsOf", () => {
	it("flags src/common importing a component", () => {
		expect(
			upwardImportsOf("src/common/x.ts", ["@/components/ui/Toast"])
		).toEqual([
			expect.objectContaining({
				path: "src/common/x.ts",
				importPath: "@/components/ui/Toast",
			}),
		]);
	});

	it("flags a component's test importing a feature", () => {
		expect(
			upwardImportsOf("src/components/ui/A/A.test.tsx", [
				"@/features/auth/testingI18n",
			])
		).toHaveLength(1);
	});

	it("flags feature code importing the route tree", () => {
		expect(
			upwardImportsOf("src/features/leave/x.ts", ["@/routeTree.gen"])
		).toHaveLength(1);
	});

	it("lets a feature's page test render the page it covers", () => {
		expect(
			upwardImportsOf("src/features/leave/Leave.test.tsx", ["@/pages/Leave"])
		).toEqual([]);
	});

	it("lets a component import src/common", () => {
		expect(
			upwardImportsOf("src/components/ui/A/A.tsx", ["@/common/weeks"])
		).toEqual([]);
	});

	it("leaves pages and routes unchecked", () => {
		expect(
			upwardImportsOf("src/pages/Leave.tsx", ["@/routes/__root"])
		).toEqual([]);
	});
});

describe("folderReachedPast", () => {
	it("allows an import through the folder's index.ts", () => {
		expect(
			folderReachedPast("src/pages/People.tsx", DIALOG_FOLDER, COMPONENT_FOLDERS)
		).toBeUndefined();
	});

	it("names the folder an outside file reaches into", () => {
		expect(
			folderReachedPast(
				"src/pages/People.tsx",
				"@/features/people/NoteDialog/schema",
				COMPONENT_FOLDERS
			)
		).toBe(DIALOG_FOLDER);
	});

	it("names the outermost folder when the import reaches a nested one", () => {
		expect(
			folderReachedPast(
				"src/pages/People.tsx",
				"@/features/people/NoteDialog/NoteBody",
				COMPONENT_FOLDERS
			)
		).toBe(DIALOG_FOLDER);
	});

	it("lets a file inside the folder read its own files", () => {
		expect(
			folderReachedPast(
				"src/features/people/NoteDialog/NoteDialog.tsx",
				"@/features/people/NoteDialog/schema",
				COMPONENT_FOLDERS
			)
		).toBeUndefined();
	});

	it("lets a compound component's sub-folders share files", () => {
		expect(
			folderReachedPast(
				"src/components/ui/Tabs/Tab/Tab.tsx",
				"@/components/ui/Tabs/Tabs/Tabs.context",
				COMPONENT_FOLDERS
			)
		).toBeUndefined();
	});
});

describe("deepImportsOf", () => {
	it("checks production code only", () => {
		const inside = ["@/features/people/NoteDialog/schema"];

		expect(
			deepImportsOf("src/pages/People.tsx", inside, COMPONENT_FOLDERS)
		).toHaveLength(1);
		expect(
			deepImportsOf("src/pages/People.test.tsx", inside, COMPONENT_FOLDERS)
		).toEqual([]);
	});
});

describe("compare", () => {
	const upwardImport = {
		path: "src/common/x.ts",
		importPath: "@/features/a",
		remedy: "move it",
	};
	const deepImport = {
		path: "src/pages/People.tsx",
		importPath: "@/features/people/NoteDialog/schema",
		folder: DIALOG_FOLDER,
	};

	it("passes when every finding is listed and every listed entry is found", () => {
		expect(
			compare(
				{ upwardImports: [upwardImport], deepImports: [deepImport] },
				{
					allowedUpwardImporters: ["src/common/x.ts"],
					allowedDeepImports: ["@/features/people/NoteDialog/schema"],
				}
			)
		).toEqual([]);
	});

	it("names the file, the import and what to do for a new upward import", () => {
		expect(
			compare({ upwardImports: [upwardImport], deepImports: [] }, NO_EXCEPTIONS)
		).toEqual(["src/common/x.ts imports @/features/a: move it"]);
	});

	it("names the folder and what to do for a new deep import", () => {
		expect(
			compare({ upwardImports: [], deepImports: [deepImport] }, NO_EXCEPTIONS)
		).toEqual([
			"src/pages/People.tsx imports @/features/people/NoteDialog/schema, past the index.ts of @/features/people/NoteDialog: export it from that index.ts and import @/features/people/NoteDialog, or move it out of the folder",
		]);
	});

	it("says which line to delete when a listed exception is no longer needed", () => {
		expect(
			compare(
				{ upwardImports: [], deepImports: [] },
				{
					allowedUpwardImporters: ["src/common/x.ts"],
					allowedDeepImports: ["@/features/people/NoteDialog/schema"],
				}
			)
		).toEqual([
			"no longer imports up a layer, delete it from ALLOWED_UPWARD_IMPORTERS: src/common/x.ts",
			"no longer imported past an index.ts, delete it from ALLOWED_DEEP_IMPORTS: @/features/people/NoteDialog/schema",
		]);
	});
});
