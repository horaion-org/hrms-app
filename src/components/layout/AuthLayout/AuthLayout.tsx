import { useEffect, useState, type ReactNode } from "react";
import slideMobile from "@/assets/images/png/auth-slide-1.png";
import slideSchedule from "@/assets/images/png/auth-slide-2.png";
import slideLeave from "@/assets/images/png/auth-slide-3.png";
import type { FunctionComponent } from "@/common/types";

type AuthLayoutProps = {
	children: ReactNode;
	variant?: "split" | "centered";
};

// The confirmed design frame is the middle slide: its dot pill sits in the
// middle, and its hero mockup (the schedule page, which also carries the
// product wordmark) is slide 2.
const SLIDES = [slideMobile, slideSchedule, slideLeave];
const INITIAL_SLIDE = 1;
const INTERVAL_MS = 5000;

// The design's carousel pattern: the active slide is the large center card
// while the previous and next slides queue at the sides at 60% opacity,
// bleeding off the panel's edges.
const SLOT_CLASSES = {
	center: "top-[11%] left-[24%] z-10 w-[52%] opacity-100",
	left: "top-[23%] left-[-11%] w-[31%] opacity-60",
	right: "top-[23%] left-[80%] w-[31%] opacity-60",
} as const;

/**
 * Split-screen shell for the auth pages, after the confirmed design. The
 * brand panel is a slider — one product mockup per slide over a fixed
 * headline — auto-advancing every five seconds, pausing on hover or focus,
 * and holding still for reduced-motion users. Below `lg` the panel is hidden
 * and the form renders centered.
 */
export const AuthLayout = ({
	children,
	variant = "split",
}: AuthLayoutProps): FunctionComponent => {
	const [active, setActive] = useState(INITIAL_SLIDE);
	const [paused, setPaused] = useState(false);

	useEffect((): (() => void) | undefined => {
		const reduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches;
		if (paused || reduced) {
			return undefined;
		}
		const timer = window.setInterval(() => {
			setActive((current) => (current + 1) % SLIDES.length);
		}, INTERVAL_MS);
		return () => {
			window.clearInterval(timer);
		};
	}, [paused]);

	return (
		<div className="flex min-h-screen bg-white">
			{variant === "split" && (
				<aside
					className="hidden p-4 lg:flex lg:w-[57%]"
					onBlur={() => {
						setPaused(false);
					}}
					onFocus={() => {
						setPaused(true);
					}}
					onMouseEnter={() => {
						setPaused(true);
					}}
					onMouseLeave={() => {
						setPaused(false);
					}}
				>
					<div className="relative flex-1 overflow-hidden rounded-[2.5rem] bg-ink-blue-700">
						{SLIDES.map((slide, index) => {
							// 0 = active (center), 1 = next (right), 2 = previous (left)
							const offset = (index - active + SLIDES.length) % SLIDES.length;
							const slot =
								offset === 0
									? SLOT_CLASSES.center
									: offset === 1
										? SLOT_CLASSES.right
										: SLOT_CLASSES.left;
							return (
								<img
									key={slide}
									alt={index === INITIAL_SLIDE ? "Active Workforce" : ""}
									className={`absolute max-w-none motion-safe:transition-all motion-safe:duration-700 ${slot}`}
									src={slide}
								/>
							);
						})}
						<div className="absolute bottom-[9%] left-[11%] max-w-md">
							<p className="text-3xl font-bold text-white">
								Smarter scheduling,
								<br />
								simplified.
							</p>
							<p className="mt-3 text-sm text-white/80">
								Plan shifts, assign teams, and stay on top of every schedule —
								all in one place.
							</p>
							<div className="mt-6 flex items-center gap-2">
								{SLIDES.map((slide, index) => (
									<button
										key={slide}
										aria-current={index === active}
										aria-label={`Go to slide ${index + 1}`}
										type="button"
										className={
											index === active
												? "h-2 w-6 rounded-full bg-white"
												: "size-2 rounded-full bg-ink-blue-300"
										}
										onClick={() => {
											setActive(index);
										}}
									/>
								))}
							</div>
						</div>
					</div>
				</aside>
			)}
			<main
				className={
					variant === "centered"
						? "flex flex-1 justify-center px-6 py-10 sm:py-[76px]"
						: "flex flex-1 items-center justify-center px-4 py-12"
				}
			>
				<div
					className={
						variant === "centered"
							? "w-full max-w-[480px]"
							: "w-full max-w-[382px]"
					}
				>
					{children}
				</div>
			</main>
		</div>
	);
};
