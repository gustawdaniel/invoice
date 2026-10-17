// "PRECISE LAB SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ" → "PRECISE LAB sp. z o.o."
export function shortName(name: string): string {
	return name
		.replace(/SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ/i, 'sp. z o.o.')
		.replace(/SPÓŁKA AKCYJNA/i, 'S.A.')
		.replace(/SPÓŁKA KOMANDYTOWA/i, 'sp.k.')
		.replace(/SPÓŁKA JAWNA/i, 'sp.j.')
		.replace(/^Individual Entrepreneur /i, 'IE ')
		.trim();
}

export function ago(iso: string | null, now = Date.now()): string {
	if (!iso) return 'never';
	const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
	if (seconds < 60) return 'just now';
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours} h ago`;
	const days = Math.round(hours / 24);
	if (days < 30) return `${days} d ago`;
	return new Date(iso).toLocaleDateString();
}

export function initials(name: string): string {
	return name
		.split(/[\s@.]+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join('');
}

export function download(content: string, filename: string, type: string) {
	const link = document.createElement('a');
	link.href = URL.createObjectURL(new Blob([content], { type }));
	link.download = filename;
	link.click();
	URL.revokeObjectURL(link.href);
}
