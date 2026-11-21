/**
 * How long the app waits for a read the scheduling engine answers while the
 * manager waits (repair options, the rules check). The API waits up to 30 s
 * for the engine and may ask it once more after a failure that came back
 * within a second: about 1 + 2 + 2 + 30 s at worst. The app waits longer, so
 * the API's own "too slow" answer arrives before the app gives up.
 */
export const ENGINE_ANSWER_WAIT_MILLISECONDS = 40_000;
