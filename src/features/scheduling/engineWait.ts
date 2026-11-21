/**
 * How long the app waits for a read the scheduling engine answers while the
 * manager waits (repair options, the rules check). The API waits up to 30 s
 * for the engine, so its own "too slow" answer arrives before the app gives up.
 */
export const ENGINE_ANSWER_WAIT_MILLISECONDS = 35_000;
