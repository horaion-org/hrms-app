import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import type { FunctionComponent } from "@/common/types";
import type { Department } from "@/features/organisation/api";
import type { OrganisationList } from "@/features/organisation/useOrganisationList";
import { periodStartingOn } from "@/features/scheduling/periods";
import {
	ScheduleSetupStep,
	type ScheduleSetupStepProps,
} from "@/features/scheduling/ScheduleSetupStep";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const READY: OrganisationList<Department> = {
	status: "ready",
	total: 2,
	items: [
		{
			departmentId: "d-1",
			branchId: "b-1",
			name: "Front Office",
			status: "ACTIVE",
		},
		{ departmentId: "d-2", branchId: "b-1", name: "Kitchen", status: "ACTIVE" },
	],
};

const PERIODS = [
	periodStartingOn("2026-10-12"),
	periodStartingOn("2026-10-19"),
];

const DEFAULTS = {
	departmentId: "",
	name: "",
	periodStart: "2026-10-12",
	includeLeave: true,
	allowOpenShifts: false,
};

const Harness = (props: Partial<ScheduleSetupStepProps>): FunctionComponent => (
	<>
		<ScheduleSetupStep
			defaultValues={DEFAULTS}
			departments={READY}
			formId="setup"
			periods={PERIODS}
			onSubmit={vi.fn()}
			{...props}
		/>
		<button form="setup" type="submit">
			Next
		</button>
	</>
);

describe("ScheduleSetupStep", () => {
	it("given_nothingEntered_when_submitted_then_asksForDepartmentAndName", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		render(<Harness onSubmit={onSubmit} />);

		await user.click(screen.getByRole("button", { name: "Next" }));

		expect(await screen.findByText("Choose a department.")).toBeVisible();
		expect(screen.getByText("Enter a schedule name.")).toBeVisible();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("given_everythingChosen_when_submitted_then_reportsTheSetup", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		render(<Harness onSubmit={onSubmit} />);

		await user.click(screen.getByRole("button", { name: /Department/ }));
		await user.click(await screen.findByRole("option", { name: "Kitchen" }));
		await user.type(
			screen.getByRole("textbox", { name: /Schedule Name/ }),
			"  Kitchen – Week 42 "
		);
		await user.click(screen.getByRole("button", { name: /Schedule Period/ }));
		await user.click(await screen.findByRole("option", { name: /19.+25/ }));
		await user.click(
			screen.getByRole("checkbox", { name: "Allow open shifts" })
		);
		await user.click(screen.getByRole("button", { name: "Next" }));

		await vi.waitFor(() => {
			expect(onSubmit).toHaveBeenCalledOnce();
		});
		expect(onSubmit.mock.calls[0]?.[0]).toEqual({
			departmentId: "d-2",
			name: "Kitchen – Week 42",
			periodStart: "2026-10-19",
			includeLeave: true,
			allowOpenShifts: true,
		});
	});

	it("given_theSettings_when_rendered_then_eachIsDescribed", () => {
		render(<Harness />);

		expect(
			screen.getByRole("checkbox", { name: "Include leave requests" })
		).toHaveAccessibleDescription(
			"Consider approved leave when generating the schedule."
		);
		expect(screen.getByRole("note")).toHaveTextContent(
			"Select a period that aligns with your business operations."
		);
	});

	it("given_departmentsHidden_when_rendered_then_disablesTheChoiceAndSaysWhy", () => {
		render(<Harness departments={{ status: "hidden" }} />);

		expect(screen.getByRole("button", { name: /Department/ })).toBeDisabled();
		expect(
			screen.getByText("You don’t have permission to see departments.")
		).toBeVisible();
	});
});
