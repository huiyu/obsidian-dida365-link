import { isBlankString } from './util';


test('isBlankString', () => {
	expect(isBlankString('')).toBe(true)
	expect(isBlankString(' ')).toBe(true)
	expect(isBlankString(undefined)).toBe(true)
	expect(isBlankString(null)).toBe(true)
	expect(isBlankString('\t')).toBe(true)
	expect(isBlankString('a')).toBe(false)
	expect(isBlankString(' a')).toBe(false)
	expect(isBlankString('a ')).toBe(false)
	expect(isBlankString(' a ')).toBe(false)
	expect(isBlankString(' a b ')).toBe(false)
})



