/** Minutes in one day. */
export const MINUTES_PER_DAY = 24 * 60;

/** The grain of the day: times are chosen in these steps, as shifts and availability are. */
export const TIME_STEP_MINUTES = 30;

/** Minutes since midnight of an "HH:mm" time. */
export const minutesOfDay = (time: string): number => {
	const [hours = 0, minutes = 0] = time.split(":").map(Number);
	return hours * 60 + minutes;
};

/** The "HH:mm" time `minutes` after midnight, wrapping past the end of the day. */
export const timeOfDay = (minutes: number): string => {
	const wrapped = minutes % MINUTES_PER_DAY;
	const hours = String(Math.floor(wrapped / 60)).padStart(2, "0");
	return `${hours}:${String(wrapped % 60).padStart(2, "0")}`;
};

/** Every "HH:mm" a time may be chosen at, one per step from midnight. */
export const timeSteps = (): Array<string> => {
	const times: Array<string> = [];
	for (let minutes = 0; minutes < MINUTES_PER_DAY; minutes += TIME_STEP_MINUTES)
		times.push(timeOfDay(minutes));
	return times;
};
