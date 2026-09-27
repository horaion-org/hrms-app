import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import slideMobile from "@/assets/images/png/auth-slide-1.png";
import slideSchedule from "@/assets/images/png/auth-slide-2.png";
import slideLeave from "@/assets/images/png/auth-slide-3.png";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type AuthLayoutProps = {
	/** The page's heading. */
	title: string;
	description?: ReactNode;
	children: ReactNode;
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
	title,
	description,
	children,
}: AuthLayoutProps): FunctionComponent => {
	const { t } = useTranslation();
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
								alt={index === INITIAL_SLIDE ? t("authLayout.slideAlt") : ""}
								src={slide}
								className={joinClassNames(
									"absolute max-w-none motion-safe:transition-all motion-safe:duration-700",
									slot
								)}
							/>
						);
					})}
					<div className="absolute bottom-[9%] left-[11%] max-w-md">
						<p className="text-3xl font-bold text-white">
							{t("authLayout.headline")}
						</p>
						<p className="mt-3 text-sm text-white/80">
							{t("authLayout.tagline")}
						</p>
						<div className="mt-6 flex items-center gap-2">
							{SLIDES.map((slide, index) => (
								<button
									key={slide}
									aria-current={index === active}
									aria-label={t("authLayout.goToSlide", { number: index + 1 })}
									type="button"
									className={joinClassNames(
										"cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
										index === active
											? "h-2 w-6 bg-white"
											: "size-2 bg-ink-blue-300"
									)}
									onClick={() => {
										setActive(index);
									}}
								/>
							))}
						</div>
					</div>
				</div>
			</aside>
			<main className="flex flex-1 items-center justify-center px-4 py-12">
				<div className="w-full max-w-sm">
					<div className="space-y-1">
						<h1 className="text-3xl font-bold text-ink-blue-900">{title}</h1>
						{description === undefined ? null : (
							<p className="text-sm text-neutral-700">{description}</p>
						)}
					</div>
					<div className="mt-8">{children}</div>
				</div>
			</main>
		</div>
	);
};
