type TriggerRect = Pick<DOMRect, "left" | "top" | "bottom" | "width">;
type PanelPosition = {
	left: number;
	top: number;
	width: number;
	maxHeight: number;
};

export const positionPanel = (
	trigger: TriggerRect,
	panelHeight: number,
	viewportWidth: number,
	viewportHeight: number
): PanelPosition => {
	const padding = 8;
	const gap = 4;
	const available = Math.max(0, viewportHeight - padding * 2);
	const below = Math.min(
		available,
		Math.max(0, viewportHeight - trigger.bottom - gap - padding)
	);
	const above = Math.min(available, Math.max(0, trigger.top - gap - padding));
	const flip = panelHeight > below && above > below;
	const maxHeight = flip ? above : below;
	const width = Math.min(
		trigger.width,
		Math.max(0, viewportWidth - padding * 2)
	);
	return {
		left: Math.max(
			padding,
			Math.min(trigger.left, viewportWidth - width - padding)
		),
		top: Math.max(
			padding,
			Math.min(
				viewportHeight - padding - Math.min(panelHeight, maxHeight),
				flip
					? trigger.top - gap - Math.min(panelHeight, maxHeight)
					: trigger.bottom + gap
			)
		),
		width,
		maxHeight,
	};
};
