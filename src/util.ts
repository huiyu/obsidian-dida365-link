/**
 * Check if a string is blank (null, undefined, or empty)
 * @param str The string to check
 * @return true if the string is blank, false otherwise
 */
export function isBlankString(str: string | null | undefined): boolean {
	if (str === null || str === undefined) {
		return true;
	}

	if (typeof str === 'string' && str.trim() === '') {
		return true;
	}

	return false;
}

export function includeIgnoreCase(source: string, search: string): boolean {
	console.log(source, search)
	return source.toLowerCase().includes(search.toLowerCase());
}
