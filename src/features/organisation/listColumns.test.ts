import type { TFunction } from "i18next";
import { expect, it } from "vitest";
import { actionsColumn, nameColumn } from "@/features/organisation/listColumns";

const t = ((key: string) => key) as TFunction;

it("pins every list's name to the start and its actions to the end", () => {
	expect(nameColumn("Name").pin).toBe("start");
	expect(
		actionsColumn(
			t,
			() => null,
			() => true,
			() => undefined
		).pin
	).toBe("end");
});
