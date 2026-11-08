import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import type { Role } from "./support/environment";
import { readSeed } from "./support/seed-data";
import { actual, openAs, screen, settle } from "./support/ui";

/**
 * Spanish walk-through (app #108): a browser set to es-ES gets the Spanish bundle. Each screen is checked for raw
 * translation keys and for English labels that have a different Spanish translation (an untranslated leftover).
 */

const seed = readSeed();
const DATA_NAMES = [
	...seed.members.map((member) => member.name),
	"Ada Admin", "Ivy Import", "Ike Import", "Morning", "Evening", "Night", "Operations", "Support", "Security Officer", "Supervisor", "Support Agent",
	"Annual leave", "Sick leave", "Unpaid leave", "Study leave", "Exam day", "Day off",
	// Round 2's people, weeks and remarks: data the specs wrote, not UI copy.
	"Cara Code", "Dev Code", "Eve Extra", "Fay Extra", "Friday night cover", "Published too early; a corrected roster follows", "Approved after publishing", "Booked early", "Approved late",
	"Ops cover offers week", "Ops approvals UI week", "Ops approvals reject week", "Ops approvals withdraw week", "Ops approvals edit week", "Ops approvals carry week", "Ops approvals distinct week", "Ops leave ignored week", "Ops withdraw week",
	"Ops week 47", "Ops week 48", "Ops week 49", "Ops week 47 again", "Ops findings week", "Ops quick publish", "Ops approvals week", "Ops rejected week", "Support week", "Support matrix week", "E2E Security Co",
].sort((a, b) => b.length - a.length);
const english = flatten(JSON.parse(readFileSync("src/assets/locales/en/translations.json", "utf8")));
const spanish = flatten(JSON.parse(readFileSync("src/assets/locales/es/translations.json", "utf8")));
// Labels long enough to be unambiguous whose Spanish differs: seeing them on a Spanish screen is a leftover.
const telltales = Object.entries(english)
	.filter(([key, value]) => typeof value === "string" && !value.includes("{{") && value.length >= 6 && spanish[key] && spanish[key] !== value && /^[A-Z][a-z]+( [a-z]+){0,2}$/.test(value))
	.map(([, value]) => value as string);

function flatten(object: any, prefix = ""): Record<string, string> {
	return Object.entries(object).reduce((all: Record<string, string>, [key, value]) => {
		const path = prefix ? `${prefix}.${key}` : key;
		return typeof value === "object" && value !== null ? { ...all, ...flatten(value, path) } : { ...all, [path]: String(value) };
	}, {});
}

const SCREENS: [Role, string, string][] = [
	["admin", "dashboard", "/"],
	["manager", "scheduling", "/scheduling"],
	["manager", "roster", `/scheduling/${seed.schedules.published}`],
	["manager", "leave", "/leave"],
	["admin", "settings", "/settings"],
	["admin", "people", "/people"],
	["worker", "my-roster", `/me/schedules/${seed.schedules.published}`],
	["worker", "notifications", "/notifications"],
	["admin", "register", "/register"],
];

test("E2E-110 Spanish walk-through: every screen in Spanish, no raw keys, no English leftovers", async ({ browser }, testInfo) => {
	const findings: string[] = [];
	const langFindings: string[] = [];
	for (const [role, name, path] of SCREENS) {
		const page = await openAs(browser, role, { width: 1440, height: 900 }, "es-ES");
		// The saved sign-in state carries the detector's cached "en"; a Spanish user's browser holds "es" there.
		await page.addInitScript(() => window.localStorage.setItem("i18nextLng", "es"));
		await page.goto(path);
		await settle(page);
		await screen(page, testInfo, "E2E-110", name);
		let text = await page.locator("body").innerText();
		// Names are data, not UI copy: people, shifts, departments, job titles, schedules and the company's leave types.
		for (const name of DATA_NAMES) text = text.split(name).join(" ");
		// A remark is what someone typed, shown after "Comentario:": data, whatever its language.
		text = text.replace(/Comentario:[^\n]*/g, " ");
		const lang = await page.evaluate(() => document.documentElement.lang);
		const rawKeys = text.match(/\b[a-z]+(?:\.[a-zA-Z]+){2,}\b/g) ?? [];
		const leftovers = [...new Set(telltales.filter((label) => new RegExp(`(^|\\n|\\s)${label}(\\s|$)`).test(text)))];
		const contexts = leftovers.map((label) => (text.match(new RegExp(`.{0,30}${label}.{0,30}`)) ?? [label])[0].replace(/\s+/g, " "));
		if (rawKeys.length || leftovers.length) findings.push(`${name}: raw keys [${rawKeys.slice(0, 5).join(", ")}] English [${contexts.slice(0, 6).join(" ¦ ")}]`);
		if (lang !== "es") langFindings.push(`${name} html lang="${lang}"`);
		await page.context().close();
	}
	actual(testInfo, findings.length ? findings.join(" | ") : `all ${SCREENS.length} screens Spanish; no raw keys or English UI leftovers (checked against ${telltales.length} labels)`);
	actual(testInfo, langFindings.length ? `document language not switched: ${langFindings.join(", ")}` : "html lang is es on every screen");
	expect(findings).toEqual([]);
	expect.soft(langFindings, "html lang follows the UI language").toEqual([]);
});
