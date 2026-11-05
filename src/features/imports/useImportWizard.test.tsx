import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
	CHECK_STEP,
	IMPORT_STEP,
	TEMPLATE_STEP,
	UPLOAD_STEP,
} from "@/features/imports/importWizard";
import {
	useImportWizard,
	type ImportWizardSource,
} from "@/features/imports/useImportWizard";

type Check = { readyRows: number };
type Refusal = "UNSUPPORTED_FILE" | "UNKNOWN";

const wrapper = ({ children }: { children: ReactNode }): ReactNode => (
	<QueryClientProvider
		client={
			new QueryClient({ defaultOptions: { mutations: { retry: false } } })
		}
	>
		{children}
	</QueryClientProvider>
);

const source = (
	overrides: Partial<ImportWizardSource<Check, Refusal>> = {}
): ImportWizardSource<Check, Refusal> => ({
	openedImportId: undefined,
	downloadTemplate: vi.fn(),
	checkFile: vi.fn(() => Promise.resolve({ readyRows: 2 })),
	clientFileProblem: (file) =>
		file.name.endsWith(".pdf") ? "UNSUPPORTED_FILE" : undefined,
	refusalCode: () => "UNKNOWN",
	clearShownImport: vi.fn(),
	...overrides,
});

const file = (name: string): File => new File(["Name"], name);

describe("useImportWizard", () => {
	it("refuses a file before sending it, and moves to the check once a file is checked", async () => {
		const options = source();
		const { result } = renderHook(() => useImportWizard(options), { wrapper });
		expect(result.current.currentStep).toBe(TEMPLATE_STEP);

		act(() => {
			result.current.goTo(UPLOAD_STEP);
			result.current.choose(file("people.pdf"));
		});
		expect(result.current.refusal).toBe("UNSUPPORTED_FILE");
		expect(options.checkFile).not.toHaveBeenCalled();

		act(() => {
			result.current.choose(file("people.csv"));
		});
		await waitFor(() => {
			expect(result.current.currentStep).toBe(CHECK_STEP);
		});
		expect(result.current.refusal).toBeUndefined();
		expect(result.current.check).toEqual({ readyRows: 2 });
		expect(result.current.file?.name).toBe("people.csv");
	});

	it("words a refused check with the import's own refusal code", async () => {
		const { result } = renderHook(
			() =>
				useImportWizard(
					source({ checkFile: () => Promise.reject(new Error("no")) })
				),
			{ wrapper }
		);

		act(() => {
			result.current.choose(file("people.csv"));
		});

		await waitFor(() => {
			expect(result.current.refusal).toBe("UNKNOWN");
		});
	});

	it("sits at the last step while an import is shown, and starts over from the upload", () => {
		const options = source({ openedImportId: "i-1" });
		const { result } = renderHook(() => useImportWizard(options), { wrapper });
		expect(result.current.currentStep).toBe(IMPORT_STEP);

		act(() => {
			result.current.goTo(TEMPLATE_STEP);
		});
		expect(result.current.currentStep).toBe(IMPORT_STEP);

		act(() => {
			result.current.startOver();
		});
		expect(options.clearShownImport).toHaveBeenCalledOnce();
	});

	it("clears the refusal when the import is about to be confirmed", () => {
		const { result } = renderHook(() => useImportWizard(source()), {
			wrapper,
		});

		act(() => {
			result.current.refuse("UNKNOWN");
		});
		act(() => {
			result.current.openConfirm();
		});
		expect(result.current.confirming).toBe(true);
		expect(result.current.refusal).toBeUndefined();

		act(() => {
			result.current.closeConfirm();
		});
		expect(result.current.confirming).toBe(false);
	});
});
