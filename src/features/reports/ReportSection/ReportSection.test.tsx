import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ReportSection } from "@/features/reports/ReportSection";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const overtimeFinding = (): { key: string; values: { count: number } } => ({
	key: "overLimit",
	values: { count: 2 },
});

describe("ReportSection", () => {
	it("asks its question and heads its table with the finding once answered", () => {
		render(
			<ReportSection
				findingOf={overtimeFinding}
				id="overtime"
				isEmpty={() => false}
				read={{ status: "ready", data: "answer" }}
			>
				{(data) => <p>{data}</p>}
			</ReportSection>
		);

		const section = screen.getByRole("region", {
			name: "2 people went over the monthly limit",
		});
		expect(section).toHaveTextContent("Is overtime under control?");
		expect(section).toHaveTextContent("answer");
	});

	it("says an empty answer in one line, with no table", () => {
		render(
			<ReportSection
				findingOf={() => ({ key: "none" })}
				id="stability"
				isEmpty={() => true}
				read={{ status: "ready", data: [] }}
			>
				{() => <table />}
			</ReportSection>
		);

		expect(
			screen.getByText("No published rosters in these dates.")
		).toBeInTheDocument();
		expect(screen.queryByRole("table")).toBeNull();
	});

	it("names the section plainly and says when its read failed", () => {
		render(
			<ReportSection
				findingOf={overtimeFinding}
				id="stability"
				isEmpty={() => false}
				read={{ status: "error" }}
			>
				{() => null}
			</ReportSection>
		);

		expect(
			screen.getByRole("region", { name: "Changes after publishing" })
		).toBeInTheDocument();
		expect(screen.getByRole("alert")).toHaveTextContent(
			"We couldn’t load this table."
		);
	});

	it("says to choose a valid range instead of loading when the range can't be asked for", () => {
		render(
			<ReportSection
				rangeInvalid
				findingOf={overtimeFinding}
				id="overtime"
				isEmpty={() => false}
				read={{ status: "pending" }}
			>
				{() => null}
			</ReportSection>
		);

		expect(
			screen.getByText("Choose a valid range to see this.")
		).toBeInTheDocument();
		expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
	});

	it("is left out where its read is out of reach", () => {
		const { container } = render(
			<ReportSection
				findingOf={overtimeFinding}
				id="staffing"
				isEmpty={() => false}
				read={{ status: "hidden" }}
			>
				{() => null}
			</ReportSection>
		);

		expect(container).toBeEmptyDOMElement();
	});
});
