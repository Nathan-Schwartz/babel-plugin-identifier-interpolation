import path from 'path';
import fs from 'fs';
import assert, { AssertionError } from 'assert';
import { transformFileSync } from 'babel-core';
import plugin from '../src';

function trim(str) {
  return str.replace(/^\s+|\s+$/, '');
}

describe('Identifier Interpolation', () => {
  const transformationFixturesDir = path.join(__dirname, 'fixtures', 'transformations');
  fs.readdirSync(transformationFixturesDir).map((caseName) => {
    it(`should ${caseName.split('-').join(' ')}`, () => {
      const actualPath = path.join(transformationFixturesDir, caseName, 'actual.js');
      const expectedPath = path.join(transformationFixturesDir, caseName, 'expected.js');

      const actual = transformFileSync(actualPath).code;
      const expected = fs.readFileSync(path.join(expectedPath)).toString();

      assert.equal(trim(actual), trim(expected));
    });
  });

  const parsingErrorFixturesDir = path.join(__dirname, 'fixtures', 'parsing-errors');
  fs.readdirSync(parsingErrorFixturesDir).map((caseName) => {
    it(`should ${caseName.split('-').join(' ')}`, () => {
      const actualPath = path.join(parsingErrorFixturesDir, caseName, 'actual.js');
      const expectedPath = path.join(parsingErrorFixturesDir, caseName, 'expectedMessage.txt');

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
