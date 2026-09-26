// Registers jest-dom's matchers with Vitest's expect. Since jest-dom v6 this
// is a side-effect import; the older `expect.extend(matchers)` form imports an
// undefined default and throws during setup before any test can run.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
	cleanup();
});
