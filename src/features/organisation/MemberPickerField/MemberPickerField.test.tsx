import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import type { FunctionComponent } from "@/common/types";
import type { CompanyMember } from "@/features/organisation/api";
import {
	MemberPickerField,
	type MemberPickerFieldProps,
} from "@/features/organisation/MemberPickerField";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const SITI: CompanyMember = {
	membershipId: "m-3",
	displayName: "Siti Rahman",
	status: "ACTIVE",
};

const field = (
	props: Partial<
		Omit<MemberPickerFieldProps, "multiple" | "value" | "onChange">
	> = {}
): FunctionComponent => (
	<MemberPickerField
		hint="They decide this step."
		id="people"
		label="People"
		loadFailed={false}
		loading={false}
		noResultsText="Nobody can approve here yet."
		options={[SITI]}
		placeholder="Choose people"
		query=""
		value={[]}
		onChange={vi.fn()}
		onQueryChange={vi.fn()}
		{...props}
	/>
);

const openList = async (
	user: ReturnType<typeof userEvent.setup>
): Promise<void> => {
	await user.click(screen.getByRole("button", { name: "People" }));
};

it("given_options_when_opened_then_listsThem", async () => {
	const user = userEvent.setup();
	render(field());

	await openList(user);

	expect(
		screen.getByRole("option", { name: "Siti Rahman" })
	).toBeInTheDocument();
});

it("given_noOptions_when_opened_then_showsTheCallersEmptyLine", async () => {
	const user = userEvent.setup();
	render(field({ options: [] }));

	await openList(user);

	expect(screen.getByText("Nobody can approve here yet.")).toBeInTheDocument();
});

it("given_loadFailed_when_opened_then_showsTheLoadFailedLineInstead", async () => {
	const user = userEvent.setup();
	render(field({ options: [], loadFailed: true }));

	await openList(user);

	expect(
		screen.getByText("We couldn’t load people. Try again.")
	).toBeInTheDocument();
	expect(screen.queryByText("Nobody can approve here yet.")).toBeNull();
});

it("given_footerText_when_opened_then_showsItAndNothingWithoutIt", async () => {
	const user = userEvent.setup();
	const { unmount } = render(
		field({ footerText: "Showing people who can approve" })
	);

	await openList(user);

	expect(
		screen.getByText("Showing people who can approve")
	).toBeInTheDocument();
	unmount();
	render(field());
	await openList(user);
	expect(screen.queryByText("Showing people who can approve")).toBeNull();
});

it("given_typing_when_searched_then_reportsTheQuery", async () => {
	const user = userEvent.setup();
	const onQueryChange = vi.fn();
	render(field({ onQueryChange }));

	await openList(user);
	await user.type(screen.getByPlaceholderText("Search people"), "S");

	expect(onQueryChange).toHaveBeenCalledWith("S");
});
