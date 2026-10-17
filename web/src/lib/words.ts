const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function below1000(n: number): string {
	const parts: string[] = [];
	if (n >= 100) {
		parts.push(`${ONES[Math.floor(n / 100)]} hundred`);
		n %= 100;
		if (n) parts.push('and');
	}
	if (n >= 20) parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ''));
	else if (n) parts.push(ONES[n]);
	return parts.join(' ');
}

// "twelve thousand three hundred and forty-five", for the English invoice
export function inWords(value: number): string {
	let n = Math.floor(Math.abs(value));
	if (n === 0) return 'zero';
	const scales = ['', ' thousand', ' million', ' billion'];
	const parts: string[] = [];
	for (let i = 0; n > 0; i++, n = Math.floor(n / 1000)) {
		const chunk = n % 1000;
		if (chunk) parts.unshift(below1000(chunk) + scales[i]);
	}
	return parts.join(' ');
}
