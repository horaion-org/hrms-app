import type { TFunction } from "i18next";
import { expect, it } from "vitest";
import {
	actionsColumn,
	branchColumn,
	createdColumn,
	nameColumn,
	statusColumn,
} from "@/features/organisation/listColumns";

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

it("keeps name, status and actions in the shared columns on phones and leaves Branch and Created out", () => {
	const actions = actionsColumn(
		t,
		() => null,
		() => true,
		() => undefined
	);

	expect(nameColumn("Name").hideBelow).toBeUndefined();
	expect(statusColumn(t).hideBelow).toBeUndefined();
	expect(actions.hideBelow).toBeUndefined();
	expect(branchColumn(t).hideBelow).toBe("md");
	expect(createdColumn(t, "en-GB").hideBelow).toBe("md");
});
