import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Stepper, StepperStep } from "@/components/ui/Stepper";

describe("StepperStep in a Stepper", () => {
	it("removes completed steps' displayed numbers while keeping their numbered accessible names", () => {
		const steps = [
			<StepperStep key="setup" label="Setup" />,
			<StepperStep key="shifts" label="Shifts" />,
			<StepperStep key="constraints" label="Constraints" />,
		];
		const { rerender } = render(<Stepper currentStep={1}>{steps}</Stepper>);
		const setup = screen.getByRole("listitem", {
			name: /Step 1: Setup.*completed/i,
		});
		expect(within(setup).queryByText("1")).not.toBeInTheDocument();
		expect(screen.getByText("2")).toBeVisible();
		expect(screen.getByText("3")).toBeVisible();

		rerender(<Stepper currentStep={3}>{steps}</Stepper>);
		expect(screen.queryByText(/^[123]$/)).not.toBeInTheDocument();
		expect(
			screen.getByRole("listitem", { name: /Step 1: Setup.*completed/i })
		).toBeVisible();
		expect(
			screen.getByRole("listitem", { name: /Step 2: Shifts.*completed/i })
		).toBeVisible();
		expect(
			screen.getByRole("listitem", { name: /Step 3: Constraints.*completed/i })
		).toBeVisible();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});

	it("announces only steps before the current step as completed", () => {
		render(
			<Stepper currentStep={2}>
				<StepperStep label="Setup" />
				<StepperStep label="Shifts" />
				<StepperStep label="Constraints" />
				<StepperStep label="Forecast" />
			</Stepper>
		);
		expect(screen.getAllByRole("listitem", { name: /completed/i })).toEqual([
			screen.getByRole("listitem", { name: /Step 1: Setup.*completed/i }),
			screen.getByRole("listitem", { name: /Step 2: Shifts.*completed/i }),
		]);
		expect(
			screen.getByRole("listitem", {
				name: "Step 3: Constraints",
				current: "step",
			})
		).toBeVisible();
		expect(
			screen.getByRole("listitem", { name: "Step 4: Forecast", current: false })
		).toBeVisible();
	});

	it("moves the current announcement when the caller changes currentStep", () => {
		const steps = [
			<StepperStep key="setup" label="Setup" />,
			<StepperStep key="shifts" label="Shifts" />,
			<StepperStep key="constraints" label="Constraints" />,
		];
		const { rerender } = render(<Stepper currentStep={0}>{steps}</Stepper>);
		expect(screen.getAllByRole("listitem", { current: "step" })).toEqual([
			screen.getByRole("listitem", { name: /Setup/ }),
		]);
		expect(
			screen.getByRole("listitem", { name: /Shifts/ })
		).not.toHaveAttribute("aria-current");

		rerender(<Stepper currentStep={1}>{steps}</Stepper>);
		expect(screen.getAllByRole("listitem", { current: "step" })).toEqual([
			screen.getByRole("listitem", { name: /Shifts/ }),
		]);
		expect(screen.getByRole("listitem", { name: /Setup/ })).not.toHaveAttribute(
			"aria-current"
		);
		expect(
			screen.getByRole("listitem", { name: /Constraints/ })
		).not.toHaveAttribute("aria-current");
	});

	it("given_aPassedStepNotCompleted_when_shown_then_keepsItsNumberAndStaysClickable", () => {
		const onStepClick = vi.fn();
		render(
			<Stepper currentStep={2} onStepClick={onStepClick}>
				<StepperStep completed label="Setup" />
				<StepperStep completed={false} label="Shifts" />
				<StepperStep label="Constraints" />
			</Stepper>
		);

		const shifts = screen.getByRole("button", { name: "Step 2: Shifts" });
		expect(within(shifts).getByText("2")).toBeInTheDocument();
		fireEvent.click(shifts);
		expect(onStepClick).toHaveBeenCalledWith(1);
		expect(
			screen.getByRole("button", { name: "Step 1: Setup, completed" })
		).toBeVisible();
	});

	it("given_aLaterStepCompleted_when_shown_then_tickedButNotClickable", () => {
		render(
			<Stepper currentStep={0} onStepClick={vi.fn()}>
				<StepperStep completed label="Setup" />
				<StepperStep completed label="Shifts" />
				<StepperStep completed={false} label="Constraints" />
			</Stepper>
		);

		expect(
			screen.getByRole("listitem", { name: "Step 2: Shifts, completed" })
		).toBeVisible();
		expect(screen.queryByText("2")).not.toBeInTheDocument();
		expect(screen.getByText("3")).toBeVisible();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		// The current step shows where the person is, never a tick.
		expect(
			screen.getByRole("listitem", { name: "Step 1: Setup", current: "step" })
		).toBeVisible();
	});
});
