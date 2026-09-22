/**
 * Minimal reproduction for V8 block coverage versus MC/DC.
 *
 * V8 records that the RHS of the logical OR was reached, but not whether
 * Number.isNaN(parsedNumber) was true or false.
 */
export function parseNumber(value: string): number {
	const numberString = value.trim();
	const parsedNumber = Number(numberString);

	if (!numberString || Number.isNaN(parsedNumber)) {
		throw new TypeError(`Invalid string=[${value}] passed`);
	}

	return parsedNumber;
}
