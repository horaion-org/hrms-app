import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { describe, expect, it, vi } from "vitest";
import "@/common/i18n";
import { DataTable } from "@/components/ui/DataTable";
import type { ManagedLeaveDuration } from "@/features/leaveDurations/api";
import { LEAVE_DURATION_CATALOGUE_FIXTURE } from "@/features/leaveDurations/fixtures";
import {
	leaveDurationColumns,
	type LeaveDurationColumnsOptions,
} from "@/features/settings/LeaveDurationsSettings/leaveDurationColumns";

const t = i18n.getFixedT("en");

const show = (
	options: Partial<LeaveDurationColumnsOptions> = {},
	durations: Array<ManagedLeaveDuration> = LEAVE_DURATION_CATALOGUE_FIXTURE
): LeaveDurationColumnsOptions => {
	const given: LeaveDurationColumnsOptions = {
		canUpdate: true,
		canReorder: false,
		canMove: () => true,
		onMove: vi.fn(),
		onEdit: vi.fn(),
		onToggleStatus: vi.fn(),
		onDelete: vi.fn(),
		...options,
	};
	render(
		<DataTable
			columns={leaveDurationColumns(t, given)}
			data={durations}
			emptyState="None"
			getRowId={(duration) => duration.leaveDurationId}
			label="Leave durations"
		/>
	);
	return given;
};

const rows = (): Array<HTMLElement> =>
	within(screen.getByRole("table", { name: "Leave durations" }))
		.getAllByRole("row")
		.slice(1);

describe("leaveDurationColumns", () => {
	it("shows each duration's time, length, reach and status", () => {
		show();

		const [morning, prep, night] = rows();
		expect(morning).toHaveTextContent("09:00–13:00");
		expect(morning).toHaveTextContent("4 h");
		expect(morning).toHaveTextContent("All departments");
		expect(morning).toHaveTextContent("Active");
		expect(prep).toHaveTextContent("2 h 30 min");
		expect(prep).toHaveTextContent("Kitchen");
		expect(prep).toHaveTextContent("Inactive");
		expect(night).toHaveTextContent("22:00–02:00 next day");
		expect(night).toHaveTextContent("Orchard (branch)");
	});

	it("locks the rows the reader may not change and gives the rest their actions", async () => {
		const user = userEvent.setup();
		const given = show();

		const [morning, prep] = rows();
		expect(
			within(morning!).getByRole("img", {
				name: "Covers departments you don’t manage",
			})
		).toBeVisible();
		expect(within(morning!).queryByRole("button")).toBeNull();
		await user.click(
			within(prep!).getByRole("button", { name: "Edit Early prep" })
		);
		expect(given.onEdit).toHaveBeenCalledWith(
			LEAVE_DURATION_CATALOGUE_FIXTURE[1]
		);
		await user.click(
			within(prep!).getByRole("button", { name: "More actions for Early prep" })
		);
		await user.click(screen.getByRole("menuitem", { name: "Delete" }));
		expect(given.onDelete).toHaveBeenCalledWith(
			LEAVE_DURATION_CATALOGUE_FIXTURE[1]
		);
	});

	it("adds the order arrows only for a reader who may reorder", () => {
		show({ canReorder: true });

		expect(
			screen.getByRole("button", { name: "Move Late night up" })
		).toBeVisible();
	});

	it("only lists for a reader without the update key", () => {
		show({ canUpdate: false, canReorder: true });

		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.queryByRole("img")).toBeNull();
	});
});
