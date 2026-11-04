import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import * as stories from "./ImportTemplateStep.stories";

const { DownloadFailed, Organisation, People } = composeStories(stories);

it("given_eitherImport_when_shown_then_wordsTheStepWithThatImportsCopy", () => {
	const { unmount } = render(<People />);
	expect(
		screen.getByRole("button", { name: "Download template (.xlsx)" })
	).toBeEnabled();
	unmount();

	render(<Organisation />);
	expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
		/template/i
	);
});

it("given_aFailedDownload_when_shown_then_saysSoAsAnAlert", () => {
	render(<DownloadFailed />);

	expect(screen.getByRole("alert")).toBeVisible();
});
