// Registers jest-dom's matchers with Vitest's expect. Since jest-dom v6 this
// is a side-effect import; the older `expect.extend(matchers)` form imports an
// undefined default and throws during setup before any test can run.
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Headless UI observes trigger movement on close. jsdom has no layout or
// ResizeObserver; geometry is reviewed in a browser, not these unit tests.
globalThis.ResizeObserver ??= class {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
};

// Virtual lists need a viewport measurement; jsdom has no CSS layout.
const offsetHeight = Object.getOwnPropertyDescriptor(
	HTMLElement.prototype,
	"offsetHeight"
);
Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
	configurable: true,
	get() {
		if (this.getAttribute("role") === "listbox") return 240;
		if (
			this.getAttribute("role") === "option" &&
			this.hasAttribute("data-index")
		)
			return 48;
		return offsetHeight?.get?.call(this) ?? 0;
	},
});
HTMLElement.prototype.scrollTo ??= function (
	options?: ScrollToOptions | number,
	y?: number
): void {
	this.scrollTop = typeof options === "number" ? (y ?? 0) : (options?.top ?? 0);
	queueMicrotask(() => this.dispatchEvent(new Event("scroll")));
};

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
	cleanup();
});
