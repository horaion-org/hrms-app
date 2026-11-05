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
			screen.getByRole("img", { name: "Set by company, always applied" })
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

	it("marks a department's replacement of a locked constraint as stricter here, still locked", () => {
		renderOrigin({
			constraint: {
				level: "DEPARTMENT",
				lock: null,
				locked: true,
				overridesConstraintId: "company-rest",
			},
		});

		expect(screen.getByText("Stricter here")).toBeInTheDocument();
		expect(screen.getByRole("img")).toBeInTheDocument();
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
