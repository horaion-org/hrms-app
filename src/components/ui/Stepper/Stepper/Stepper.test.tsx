import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Stepper, StepperStep } from "@/components/ui/Stepper";

describe("Stepper", () => {
	it("lets a person click a completed step to request its index", async () => {
		const user = userEvent.setup();
		const onStepClick = vi.fn();
		render(
			<Stepper currentStep={2} onStepClick={onStepClick}>
				<StepperStep label="Setup" />
				<StepperStep label="Shifts" />
				<StepperStep label="Constraints" />
			</Stepper>
		);
		await user.click(
			screen.getByRole("button", { name: /Step 2: Shifts.*completed/i })
		);
		expect(onStepClick).toHaveBeenCalledExactlyOnceWith(1);
	});

	it("tabs only through completed steps and activates them with Enter and Space", async () => {
		const user = userEvent.setup();
		const onStepClick = vi.fn();
		render(
			<Stepper currentStep={2} onStepClick={onStepClick}>
				<StepperStep label="Setup" />
				<StepperStep label="Shifts" />
				<StepperStep label="Constraints" />
				<StepperStep label="Forecast" />
			</Stepper>
		);
		const setup = screen.getByRole("button", {
			name: /Step 1: Setup.*completed/i,
		});
		const shifts = screen.getByRole("button", {
			name: /Step 2: Shifts.*completed/i,
		});
		expect(screen.getAllByRole("button")).toEqual([setup, shifts]);
		await user.tab();
		expect(setup).toHaveFocus();
		await user.keyboard("{Enter}");
		expect(onStepClick).toHaveBeenLastCalledWith(0);
		await user.tab();
		expect(shifts).toHaveFocus();
		await user.keyboard(" ");
		expect(onStepClick).toHaveBeenLastCalledWith(1);
		await user.tab();
		expect(document.body).toHaveFocus();
		await user.click(
			screen.getByRole("listitem", {
				name: "Step 3: Constraints",
				current: "step",
			})
		);
		await user.click(
			screen.getByRole("listitem", { name: "Step 4: Forecast", current: false })
		);
		expect(onStepClick).toHaveBeenCalledTimes(2);
	});

	it("removes all navigation when the caller removes onStepClick", async () => {
		const user = userEvent.setup();
		const onStepClick = vi.fn();
		const steps = [
			<StepperStep key="setup" label="Setup" />,
			<StepperStep key="shifts" label="Shifts" />,
		];
		const { rerender } = render(
			<Stepper currentStep={2} onStepClick={onStepClick}>
				{steps}
			</Stepper>
		);
		expect(screen.getAllByRole("button")).toEqual([
			screen.getByRole("button", { name: /Step 1: Setup.*completed/i }),
			screen.getByRole("button", { name: /Step 2: Shifts.*completed/i }),
		]);
		expect(
			screen.queryByRole("listitem", { current: "step" })
		).not.toBeInTheDocument();
		rerender(<Stepper currentStep={2}>{steps}</Stepper>);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		await user.click(
			screen.getByRole("listitem", { name: /Step 1: Setup.*completed/i })
		);
		await user.click(
			screen.getByRole("listitem", { name: /Step 2: Shifts.*completed/i })
		);
		await user.tab();
		expect(document.body).toHaveFocus();
		expect(onStepClick).not.toHaveBeenCalled();
	});

	it.each([0, 2, 5])(
		"keeps every label accessible in a narrow container at currentStep %i",
		(currentStep) => {
			render(
				<Stepper className="max-w-lg" currentStep={currentStep}>
					<StepperStep label="Setup" />
					<StepperStep label="Shifts" />
					<StepperStep label="Constraints" />
					<StepperStep label="Forecast" />
					<StepperStep label="Generate" />
				</Stepper>
			);

			// Container-query visibility is reviewed in Storybook, not jsdom.
			const navigation = screen.getByRole("navigation", { name: "Steps" });
			for (const label of [
				/Step 1: Setup/,
				/Step 2: Shifts/,
				/Step 3: Constraints/,
				/Step 4: Forecast/,
				/Step 5: Generate/,
			]) {
				expect(
					within(navigation).getByRole("listitem", { name: label })
				).toBeInTheDocument();
			}
		}
	);

	it("announces every step completed and none current when currentStep equals the count", () => {
		render(
			<Stepper currentStep={3}>
				<StepperStep label="Setup" />
				<StepperStep label="Shifts" />
				<StepperStep label="Constraints" />
			</Stepper>
		);
		expect(screen.getAllByRole("listitem", { name: /completed/i })).toEqual([
			screen.getByRole("listitem", { name: /Step 1: Setup.*completed/i }),
			screen.getByRole("listitem", { name: /Step 2: Shifts.*completed/i }),
			screen.getByRole("listitem", { name: /Step 3: Constraints.*completed/i }),
		]);
		expect(
			screen.queryByRole("listitem", { current: "step" })
		).not.toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("announces the steps in child order with numbers inside navigation", () => {
		render(
			<Stepper currentStep={0}>
				<StepperStep label="Setup" />
				<StepperStep label="Shifts" />
				<StepperStep label="Constraints" />
			</Stepper>
		);

		const navigation = screen.getByRole("navigation", { name: "Steps" });
		const list = within(navigation).getByRole("list");
		expect(within(list).getAllByRole("listitem")).toEqual([
			within(list).getByRole("listitem", { name: "Step 1: Setup" }),
			within(list).getByRole("listitem", { name: "Step 2: Shifts" }),
			within(list).getByRole("listitem", { name: "Step 3: Constraints" }),
		]);
	});
});
