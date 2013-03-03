///<reference path='../imports.d.ts'/>

import StringReader = module('./StringReader');
import RuntimeUtils = module('../runtime/RuntimeUtils');

/**
 * Token
 */
export interface Token {
	type: string;
	value: any;
	rawValue: any;
	stringOffset: any;
}

/**
 * ExpressionTokenizer
 */
export class ExpressionTokenizer {
	/**
	 * Creates a new ExpressionTokenizer.
	 */
	constructor(public stringReader: StringReader.StringReader) {
	}

	private static operators3 = [
		'===', '!==',
	];

	private static operators2 = [
		'++', '--', '&&', '||', '..', '//', '**',
		'==', '>=', '<=', '!=', '?:',
	];

	private static operators1 = [
		'+', '-', '*', '/', '%', '|', '(', ')',
		'{', '}', '[', ']', '.', ':', ',', '<', '>', '?', '=', '~',
	];

	static tokenizeString(string: string) {
		return tokenizeStringReader(new StringReader.StringReader(string));
	}

	static tokenizeStringReader(stringReader: StringReader.StringReader) {
		return new ExpressionTokenizer(stringReader).tokenize();
	}

	/**
	 * Return a list of tokens.
	 *
	 * @return list of tokenized tokens.
	 */
	tokenize(): Token[] {
		var tokens = [];
		var stringOffset: number = 0;
	
		function emitToken(type, rawValue, value?) {
			if (value === undefined) value = rawValue;
			tokens.push({
				type     : type,
				value: value,
				rawValue: rawValue,
				stringOffset: stringOffset,
			});
		};
	
		var end = false;

		while (!end && this.stringReader.hasMore()) {
			if (this.stringReader.findRegexp(/^\-?[%\}]\}/).position == 0) {
				end = true;
				continue;
			}

			stringOffset = this.stringReader.getOffset();
			var currentChar = this.stringReader.peekChars(1);
			//console.log(currentChar);
		
			switch (currentChar) {
				// Spaces: ignore.
				case ' ': case '\t': case '\r': case '\n': case '\v':
					this.stringReader.skipChars(1);
				break;
				// String:
				case '\'': case '"':
					//throw(new Error("Strings not implemented"));
					var result = this.stringReader.findRegexp(/^(["'])(?:(?=(\\?))\2.)*?\1/);
					if (result.position !== 0) throw(new Error("Invalid string"));
					var value = this.stringReader.readChars(result.length);
					try {
						if (value.charAt(0) == "'") {
							// @TODO: fix ' escape characters
							emitToken('string', value, value.substr(1, value.length - 2));
						} else {
							emitToken('string', value, JSON.parse(value));
						}
					} catch (e) {
						throw (new Error("Can't parse [" + value + "]"));
					}
				break;
				default:
					// Numbers
					if (currentChar.match(/^\d$/)) {
						var result = this.stringReader.findRegexp(/^(0b[0-1]+|0x[0-9A-Fa-f]+|0[0-7]*|[1-9]\d*(\.\d+)?)/);
						if (result.position !== 0) throw (new Error("Invalid numeric"));
						var value = this.stringReader.readChars(result.length);
						emitToken('number', value, RuntimeUtils.interpretNumber(value));
					}
					else {
						var operatorIndex = -1;
						var _parts;
						var currentChars = this.stringReader.peekChars(5);

						// Found a bit operator
						if (_parts = currentChars.match(/^(b-and|b-or|b-xor)/)) {
							emitToken('operator', _parts[0]);
							this.stringReader.skipChars(_parts[0].length);
						}
						// Found a 3 character operator.
						else if (-1 != (operatorIndex = ExpressionTokenizer.operators3.indexOf(currentChars.substr(0, 3)))) {
							emitToken('operator', currentChars.substr(0, 3));
							this.stringReader.skipChars(3);
						}
						// Found a 2 character operator.
						else if (-1 != (operatorIndex = ExpressionTokenizer.operators2.indexOf(currentChars.substr(0, 2)))) {
							emitToken('operator', currentChars.substr(0, 2));
							this.stringReader.skipChars(2);
						}
							// Found a 1 character operator.
						else if (-1 != (operatorIndex = ExpressionTokenizer.operators1.indexOf(currentChar))) {
							emitToken('operator', currentChar);
							this.stringReader.skipChars(1);
						}
							// An ID
						else if (currentChar.match(/^[a-z_\$]$/i)) {
							var result = this.stringReader.findRegexp(/^[a-z_\$]\w*/i);
							if (result.position !== 0) throw (new Error("Assertion failed! Not expected!"));
							var value = this.stringReader.readChars(result.length);
							emitToken('id', value);
						} else {
							this.stringReader.skipChars(1);
							throw (new Error("Unknown token '" + currentChar + "' in '" + this.stringReader.peekChars(10) + "'"));
						}
					}
				break;
			}
		}
	
		//console.log(tokens);
	
		return tokens;
	}
}
