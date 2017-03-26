import path from 'path';
import fs from 'fs';
import assert, { AssertionError } from 'assert';
import { transformFileSync } from 'babel-core';
import plugin from '../src';

function trim(str) {
  return str.replace(/^\s+|\s+$/, '');
}

describe('Variable Name Interpolation', () => {
  const legalFixturesDir = path.join(__dirname, 'fixtures', 'transformations');
  fs.readdirSync(legalFixturesDir).map((caseName) => {
    it(`should ${caseName.split('-').join(' ')}`, () => {
      const actualPath = path.join(legalFixturesDir, caseName, 'actual.js');
      const expectedPath = path.join(legalFixturesDir, caseName, 'expected.js');

      const actual = transformFileSync(actualPath).code;
      const expected = fs.readFileSync(path.join(expectedPath)).toString();

      assert.equal(trim(actual), trim(expected));
    });
  });

  const failureFixturesDir = path.join(__dirname, 'fixtures', 'parsing-errors');
  fs.readdirSync(failureFixturesDir).map((caseName) => {
    it(`should ${caseName.split('-').join(' ')}`, () => {
      const actualPath = path.join(failureFixturesDir, caseName, 'actual.js');
      const expectedPath = path.join(failureFixturesDir, caseName, 'expectedMessage.txt');

      const expectedMessage = fs.readFileSync(path.join(expectedPath)).toString().trim()

      assert.throws(
        () => transformFileSync(actualPath).code,
        validateErrorMessage(expectedMessage)
      );
    });
  });
});


// Testing utility
function validateErrorMessage(expectedMessage) {
  return function validateError(err) {
    if ( ! err instanceof SyntaxError) {
      throw new AssertionError({
        message: "Expected parsing attempt to result in a thrown SyntaxError",
      })
    }

    if ( ! err.message.includes(expectedMessage.trim())) {
      throw new AssertionError({
        message: "Missing inclusion of expected string",
        actual: err.message,
        expected: expectedMessage,
      })
    }
    return true;
  }
}
