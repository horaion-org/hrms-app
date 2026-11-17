import type { TFunction } from "i18next";
import { expect, it, vi } from "vitest";
import {
	actionsColumn,
	branchColumn,
	createdColumn,
	describeList,
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

it("says a list is waiting on an access update and offers Try again", () => {
	const retry = vi.fn();
	const view = describeList(
		{ status: "error", stillUpdating: true, retry },
		"",
		false,
		"No branches yet.",
		t
	);

	expect(view.problem).toEqual({
		message: "organisation.list.stillUpdating",
		alert: true,
		retry,
	});
});

it("offers Try again on any other failed read too", () => {
	const retry = vi.fn();
	const view = describeList(
		{ status: "error", stillUpdating: false, retry },
		"",
		false,
		"No branches yet.",
		t
	);

	expect(view.problem?.message).toBe("organisation.list.failed");
	expect(view.problem?.retry).toBe(retry);
});

it("says access is being updated while a refused read waits to try again, not just Loading", () => {
	const view = describeList(
		{ status: "pending", stillUpdating: true },
		"",
		false,
		"No branches yet.",
		t
	);

	expect(view.empty).toBe("organisation.list.waitingForAccess");
});
