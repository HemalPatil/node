import assert from 'node:assert';
import { suite, test } from 'node:test';

import { parseNumber } from './proof.mts';

suite('V8 block coverage proof', () => {
	test('rejects an empty string through the left operand', () => {
		assert.throws(() => parseNumber('   '), /Invalid string/);
	});

	test('accepts a valid number after evaluating the right operand as false', () => {
		assert.strictEqual(parseNumber('3'), 3);
	});

	// Remove this test, then restore it, while collecting V8 coverage.
	// The coverage summary does not change:
	//   the first test already reaches the throw,
	//   and the second test already reaches the RHS.
	// MC/DC would distinguish this RHS=true outcome from the valid number's RHS=false outcome.
	test('rejects NaN after evaluating the right operand as true', () => {
		assert.throws(() => parseNumber('1d'), /Invalid string/);
	});
});
