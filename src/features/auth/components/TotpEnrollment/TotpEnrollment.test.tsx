import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { renderAuthPage } from "@/features/auth/testing";
import { TotpEnrollment } from "@/features/auth/components/TotpEnrollment";
import { useToastStore } from "@/store/useToastStore";

const SECRET = "JBSWY3DPEHPK3PXP";
const URI = `otpauth://totp/Horaion:jose%40acme.test?secret=${SECRET}&issuer=Horaion`;

const codeField = (): Promise<HTMLElement> =>
	screen.findByLabelText("Code from the app", { selector: "input" });

const enterCode = async (code: string): Promise<void> => {
	await userEvent.type(await codeField(), code);
	await userEvent.click(
		screen.getByRole("button", { name: "Confirm and turn on" })
	);
};

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	useToastStore.setState({ toasts: [] });
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("TotpEnrollment", () => {
	it("draws the otpauth URI as a QR code", async () => {
		renderAuthPage(
			<TotpEnrollment otpauthUri={URI} secret={SECRET} onVerify={vi.fn()} />
		);

		const qrCode = await screen.findByRole("img", {
			name: "QR code to add Horaion to your authenticator app",
		});

		expect(qrCode.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
	});

	it("shows the secret as text and copies it", async () => {
		const writeText = vi.fn(() => Promise.resolve());
		vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
		renderAuthPage(
			<TotpEnrollment otpauthUri={URI} secret={SECRET} onVerify={vi.fn()} />
		);

		expect(await screen.findByText(SECRET)).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Copy key" }));

		expect(writeText).toHaveBeenCalledWith(SECRET);
		expect(useToastStore.getState().toasts[0]?.message).toBe("Key copied.");
	});

	it("confirms the first code", async () => {
		const onVerify = vi.fn(() => Promise.resolve());
		renderAuthPage(
			<TotpEnrollment otpauthUri={URI} secret={SECRET} onVerify={onVerify} />
		);

		await enterCode("123456");

		await waitFor(() => {
			expect(onVerify).toHaveBeenCalledWith("123456");
		});
	});

	it("asks for six digits before confirming", async () => {
		const onVerify = vi.fn(() => Promise.resolve());
		renderAuthPage(
			<TotpEnrollment otpauthUri={URI} secret={SECRET} onVerify={onVerify} />
		);

		await enterCode("12a4");

		expect(await codeField()).toHaveAccessibleDescription(
			"Enter the 6-digit code from your authenticator app"
		);
		expect(onVerify).not.toHaveBeenCalled();
	});

	it("explains a refused code on the field", async () => {
		const onVerify = vi.fn(() =>
			Promise.reject(
				new ApiProblemError(400, { status: 400, errorCode: "INVALID_CODE" })
			)
		);
		renderAuthPage(
			<TotpEnrollment otpauthUri={URI} secret={SECRET} onVerify={onVerify} />
		);

		await enterCode("123456");

		await waitFor(async () => {
			expect(await codeField()).toHaveAccessibleDescription(
				"That code is not right. Check it and try again."
			);
		});
	});
});
