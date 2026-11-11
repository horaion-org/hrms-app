/**
 * Closing a Combobox puts focus back on its trigger on the next animation frame.
 * Let that land before the next step, or it pulls focus out of whatever the test
 * opens or focuses next, and a picker opened in the meantime closes again.
 */
export const afterFocusReturns = (): Promise<void> =>
	new Promise((resolve) => {
		requestAnimationFrame(() => {
			resolve();
		});
	});
