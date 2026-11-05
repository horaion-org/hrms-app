import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ConstraintOrigin } from "@/features/scheduling/constraints/ConstraintOrigin";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const renderOrigin = (
	props: Parameters<typeof ConstraintOrigin>[0]
): ReturnType<typeof render> => render(<ConstraintOrigin {...props} />);

describe("ConstraintOrigin", () => {
	it("shows a locked company constraint with the lock and its level", () => {
		renderOrigin({
			constraint: {
				level: "COMPANY",
				lock: "LOCKED",
				locked: true,
				overridesConstraintId: null,
			},
		});

		expect(
			screen.getByRole("img", { name: "Set by company" })
		).toBeInTheDocument();
		expect(screen.getByText("Company · Locked")).toBeInTheDocument();
	});

	it("shows a company default without a lock", () => {
		renderOrigin({
			constraint: {
				level: "COMPANY",
				lock: "DEFAULT",
				locked: false,
				overridesConstraintId: null,
			},
			showLevel: false,
		});

		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		expect(screen.getByText("Default")).toBeInTheDocument();
	});

	it("marks a department's replacement of a locked constraint as stricter here, without the company's lock", () => {
		renderOrigin({
			constraint: {
				level: "DEPARTMENT",
				lock: null,
				locked: true,
				overridesConstraintId: "company-rest",
				replacementStatus: "STANDS_IN",
			},
		});

		expect(screen.getByText("Stricter here")).toBeInTheDocument();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});

	it("warns that the company rule applies once the company is stricter than the replacement", () => {
		renderOrigin({
			constraint: {
				level: "DEPARTMENT",
				lock: null,
				locked: true,
				overridesConstraintId: "company-rest",
				replacementStatus: "NO_LONGER_STRICTER",
			},
		});

		const badge = screen.getByText("Company rule applies");
		expect(badge).toHaveClass("bg-warning-100");
		expect(badge).toHaveAttribute(
			"title",
			"The company’s constraint is now stricter than this one, so both apply."
		);
		expect(screen.queryByText("Stricter here")).not.toBeInTheDocument();
	});

	it("names a replacement whose company constraint is gone as the department's own", () => {
		renderOrigin({
			constraint: {
				level: "DEPARTMENT",
				lock: null,
				locked: false,
				overridesConstraintId: "company-rest",
				replacementStatus: "COMPANY_CONSTRAINT_GONE",
			},
		});

		expect(screen.getByText("This department")).toBeInTheDocument();
	});

	it("reads a generated schedule's copy by whether it stood in for the company's", () => {
		const { rerender } = renderOrigin({
			constraint: {
				level: "DEPARTMENT",
				locked: true,
				overridesConstraintId: "company-rest",
				replacesCompanyConstraint: true,
			},
		});
		expect(screen.getByText("Stricter here")).toBeInTheDocument();

		rerender(
			<ConstraintOrigin
				constraint={{
					level: "DEPARTMENT",
					locked: true,
					overridesConstraintId: "company-rest",
					replacesCompanyConstraint: false,
				}}
			/>
		);
		expect(screen.getByText("This department")).toBeInTheDocument();
	});

	it("shows a dash, not a level, for a lock it does not know on the policy's list", () => {
		renderOrigin({
			constraint: {
				level: "COMPANY",
				lock: null,
				locked: false,
				overridesConstraintId: null,
			},
			showLevel: false,
		});

		expect(screen.getByText("—")).toBeInTheDocument();
		expect(screen.queryByText("Company")).not.toBeInTheDocument();
	});

	it("marks a department's replacement of a default as changed here", () => {
		renderOrigin({
			constraint: {
				level: "DEPARTMENT",
				lock: null,
				locked: false,
				overridesConstraintId: "company-weekends",
			},
		});

		expect(screen.getByText("Changed here")).toBeInTheDocument();
	});

	it("names a department's own constraint plainly", () => {
		renderOrigin({
			constraint: {
				level: "DEPARTMENT",
				lock: null,
				locked: false,
				overridesConstraintId: null,
			},
		});

		expect(screen.getByText("This department")).toBeInTheDocument();
	});
});
