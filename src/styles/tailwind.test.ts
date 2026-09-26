// @vitest-environment node
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { createElement, type ReactNode } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { HomeIcon } from "@heroicons/react/24/outline";
import { HomeIcon as HomeFilledIcon } from "@heroicons/react/24/solid";
import { renderToStaticMarkup } from "react-dom/server";
import { compile } from "tailwindcss";
import { beforeAll, describe, expect, it } from "vitest";
import { Input, inputStatuses } from "@/components/forms/Input";
import { Button, buttonSizes, buttonVariants } from "@/components/ui/Button";
import { createMemoryRouter } from "@/common/createMemoryRouter";
import { Sidebar, SidebarItem } from "@/components/layout/Sidebar";

/*
 * Compiles the app's real Tailwind entry and inspects the generated CSS.
 * jsdom tests never process CSS, so this is the only place a missing or
 * misnamed colour token can be caught.
 */

const entry = path.resolve(import.meta.dirname, "tailwind.css");
const nodeRequire = createRequire(import.meta.url);

const loadStylesheet = async (
	id: string,
	base: string
): Promise<{ path: string; base: string; content: string }> => {
	const file =
		id.startsWith(".") || path.isAbsolute(id)
			? path.resolve(base, id)
			: path.resolve(
					path.dirname(nodeRequire.resolve(`${id}/package.json`)),
					"index.css"
				);
	return {
		path: file,
		base: path.dirname(file),
		content: await readFile(file, "utf8"),
	};
};

/** Compiles the CSS the app's stylesheet generates for the given classes. */
let compileCss: (classNames: Array<string>) => string;

beforeAll(async () => {
	const compiler = await compile(await readFile(entry, "utf8"), {
		base: path.dirname(entry),
		from: entry,
		loadStylesheet,
	});
	compileCss = (classNames): string => compiler.build(classNames);
});

const escapeRegExp = (value: string): string =>
	value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** Resolves `var(--x)` chains against the custom properties in `css`. */
const resolveValue = (css: string, value: string): string => {
	const reference = /^var\((--[\w-]+)\)$/.exec(value.trim());
	if (!reference?.[1]) return value.trim();
	const declaration = new RegExp(
		`${escapeRegExp(reference[1])}:\\s*([^;]+);`
	).exec(css);
	if (!declaration?.[1]) return value.trim();
	return resolveValue(css, declaration[1]);
};

/** CSS-escapes a class name for use as a selector, e.g. `hover:x` → `.hover\:x`. */
const selectorOf = (className: string): string =>
	`.${className.replace(/[^\w-]/g, (character) => `\\${character}`)}`;

/** The properties a Tailwind colour utility sets. */
const colourProperty =
	"(?:(?:background|border(?:-[a-z]+)*|outline|text-decoration|accent|caret|--tw-(?:inset-)?ring)-)?color|fill|stroke";

/**
 * The colour declared in the rule for `className` alone, with `var()`
 * references resolved, or undefined when the class compiles to no such rule.
 */
const colourDeclarationOf = (className: string): string | undefined => {
	const css = compileCss([className]);
	const rule = new RegExp(
		`${escapeRegExp(selectorOf(className))}(?![\\w\\\\-])[^{]*\\{[^}]*?(?<![\\w-])(?:${colourProperty}):\\s*([^;]+);`
	).exec(css);
	if (!rule?.[1]) return undefined;
	return resolveValue(css, rule[1]);
};

type Shade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

type ColourRange = { defaultShade: Shade; shades: Record<Shade, string> };

/* The design's colour ranges, pinned here independently of `tokens.css`. */
const colourRanges: Record<string, ColourRange> = {
	neutral: {
		defaultShade: 900,
		shades: {
			50: "#FBFDFF",
			100: "#F6F8FD",
			200: "#F1F3F8",
			300: "#EDEEF3",
			400: "#CDCED3",
			500: "#B0B1B6",
			600: "#85868B",
			700: "#707176",
			800: "#505156",
			900: "#2E2F33",
		},
	},
	"ink-blue": {
		defaultShade: 900,
		shades: {
			50: "#E4F2FD",
			100: "#BEDFFB",
			200: "#95CCF8",
			300: "#6EB7F5",
			400: "#52A8F3",
			500: "#3C99F1",
			600: "#378BE3",
			700: "#3179D0",
			800: "#2C68BD",
			900: "#234A9E",
		},
	},
	porcelain: {
		defaultShade: 50,
		shades: {
			50: "#EFEBE8",
			100: "#D6CCC6",
			200: "#BBAAA1",
			300: "#9F897C",
			400: "#8A6F5F",
			500: "#765643",
			600: "#6A4D3C",
			700: "#5B4133",
			800: "#4C352A",
			900: "#3D281F",
		},
	},
	success: {
		defaultShade: 600,
		shades: {
			50: "#E2F3F1",
			100: "#B8E1DB",
			200: "#8BCEC4",
			300: "#61BAAD",
			400: "#46AA9B",
			500: "#389A8A",
			600: "#348D7D",
			700: "#2F7D6D",
			800: "#2B6D5F",
			900: "#225044",
		},
	},
	warning: {
		defaultShade: 600,
		shades: {
			50: "#F7F2E3",
			100: "#EDDDB7",
			200: "#E2C78A",
			300: "#D8B15E",
			400: "#D2A243",
			500: "#CC9433",
			600: "#C88A2E",
			700: "#C27D28",
			800: "#BA7124",
			900: "#AE5E20",
		},
	},
	error: {
		defaultShade: 600,
		shades: {
			50: "#FBECEF",
			100: "#F6CFD4",
			200: "#E19DA0",
			300: "#D3797C",
			400: "#DC5D5F",
			500: "#E1504A",
			600: "#D24847",
			700: "#BF3F40",
			800: "#B23A3A",
			900: "#A13331",
		},
	},
};

const shadeCases = Object.entries(colourRanges).flatMap(([range, { shades }]) =>
	Object.entries(shades).map(([shade, hex]) => ({ range, shade, hex }))
);

const defaultShadeCases = Object.entries(colourRanges).map(
	([range, { defaultShade }]) => ({ range, defaultShade })
);

const attributeEntities: Record<string, string> = {
	"&amp;": "&",
	"&gt;": ">",
	"&lt;": "<",
	"&quot;": '"',
	"&#x27;": "'",
};

/** Decodes the entities React escapes in attributes, e.g. `[&amp;_svg]` → `[&_svg]`. */
const decodeAttribute = (value: string): string =>
	value.replace(
		/&(?:amp|gt|lt|quot|#x27);/g,
		(entity) => attributeEntities[entity] ?? entity
	);

/** Includes descendants (not only the root), so icons are checked too. */
const collectMarkupClasses = (element: ReactNode): Array<string> => [
	...new Set(
		[...renderToStaticMarkup(element).matchAll(/class="([^"]*)"/g)].flatMap(
			(match) =>
				decodeAttribute(match[1] ?? "")
					.split(/\s+/)
					.filter(Boolean)
		)
	),
];

/** Every class the Button renders with, across all variants and sizes. */
const buttonClasses = [
	...new Set(
		buttonVariants.flatMap((variant) =>
			buttonSizes.flatMap((size) =>
				collectMarkupClasses(createElement(Button, { size, variant }))
			)
		)
	),
];

/*
 * A colour utility is a colour property prefix followed by a value, after any
 * variants (`enabled:hover:` and so on). The value may be unnumbered
 * (`bg-brand`) and may carry an opacity modifier (`/50`). The prefixes are
 * shared with non-colour utilities (`text-sm`, `outline-2`), so a value is
 * treated as a colour unless it is one of those: an unknown value is checked,
 * and fails, rather than skipped. Arbitrary values (`bg-[…]`, `text-(…)`) are
 * not checked, as their type cannot be told from the class name.
 */
const colourUtility =
	/^(?:bg|text|border(?:-[xytrblse])?|outline|ring|decoration|fill|stroke|accent|caret)-([^/]+)(?:\/.+)?$/;

const nonColourValue =
	/^(?:\d+(?:\.\d+)?|\d*xs|sm|base|lg|\d*xl|offset-.+|left|center|right|justify|start|end|top|bottom|wrap|nowrap|balance|pretty|ellipsis|clip(?:-.+)?|none|auto|solid|dashed|dotted|double|wavy|hidden|collapse|separate|from-font|inset|cover|contain|fixed|local|scroll|repeat(?:-.+)?|no-repeat|origin-.+|blend-.+|linear-.+|radial(?:-.+)?|conic(?:-.+)?|\[.+\]|\(.+\))$/;

const isColourUtility = (className: string): boolean => {
	const value = colourUtility.exec(
		className.slice(className.lastIndexOf(":") + 1)
	)?.[1];
	return value !== undefined && !nonColourValue.test(value);
};

const buttonColourClasses = buttonClasses.filter(isColourUtility);

/** Every colour class an element renders with inside a loaded memory router. */
const routedColourClasses = async (
	element: ReactNode,
	initialEntry?: string
): Promise<Array<string>> => {
	const router = createMemoryRouter(element, initialEntry);
	await router.load();
	return collectMarkupClasses(createElement(RouterProvider, { router })).filter(
		isColourUtility
	);
};

describe("compiled app stylesheet", () => {
	it("compiles every colour the Sidebar rail and logo render", async () => {
		const colours = await routedColourClasses(
			createElement(Sidebar, { children: null })
		);
		expect(colours).toEqual(
			expect.arrayContaining([
				"bg-ink-blue-900",
				"fill-ink-blue-100",
				"focus-visible:outline-white",
			])
		);
		for (const className of colours) {
			expect(colourDeclarationOf(className), className).toBeDefined();
		}
	});
	it.each(["/", "/example"])(
		"compiles Sidebar item colours at %s",
		async (initialEntry) => {
			const colours = await routedColourClasses(
				createElement(SidebarItem, {
					to: "/example",
					label: "Scheduling",
					icon: HomeIcon,
					activeIcon: HomeFilledIcon,
				}),
				initialEntry
			);
			expect(colours).toEqual(
				expect.arrayContaining([
					"bg-transparent",
					"text-white",
					"not-data-[status=active]:hover:bg-ink-blue-800",
					"data-[status=active]:bg-ink-blue-100",
					"data-[status=active]:text-neutral-900",
					"focus-visible:outline-white",
					initialEntry === "/example" ? "text-ink-blue-900" : "text-white",
				])
			);
			for (const className of colours) {
				expect(colourDeclarationOf(className), className).toBeDefined();
			}
		}
	);
	it.each(shadeCases)(
		"compiles bg-$range-$shade to $hex",
		({ range, shade, hex }) => {
			expect(colourDeclarationOf(`bg-${range}-${shade}`)?.toUpperCase()).toBe(
				hex
			);
		}
	);

	it.each(defaultShadeCases)(
		"resolves the unnumbered bg-$range to its default shade $defaultShade",
		({ range, defaultShade }) => {
			expect(colourDeclarationOf(`bg-${range}`)).toBeDefined();
			expect(colourDeclarationOf(`bg-${range}`)).toBe(
				colourDeclarationOf(`bg-${range}-${defaultShade}`)
			);
		}
	);

	it("produces no rule for neutral-950", () => {
		expect(colourDeclarationOf("bg-neutral-950")).toBeUndefined();
	});

	it("keeps Tailwind's stock colours outside neutral", () => {
		expect(colourDeclarationOf("bg-red-500")).toBeDefined();
	});

	it("compiles every colour the Input renders across its states", () => {
		const colours = [
			...new Set(
				[{}, { disabled: true }, ...inputStatuses.map((status) => ({ status }))]
					.flatMap((props) => collectMarkupClasses(createElement(Input, props)))
					.filter(isColourUtility)
			),
		];
		expect(colours).toEqual(
			expect.arrayContaining([
				"border-success-600",
				"border-error-600",
				"focus-within:outline-ink-blue-500",
				"has-[>input:disabled]:bg-neutral-200",
				"has-[>input:disabled]:[&_svg]:text-neutral-500",
			])
		);
		for (const className of colours) {
			expect(colourDeclarationOf(className), className).toBeDefined();
		}
	});

	it("finds the colour utilities in the Button's variant styles", () => {
		expect(buttonColourClasses.length).toBeGreaterThan(0);
	});

	it.each(buttonColourClasses)(
		"compiles the Button's %s to a colour declaration",
		(className) => {
			expect(colourDeclarationOf(className)).toBeDefined();
		}
	);
});
