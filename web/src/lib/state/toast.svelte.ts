export type Tone = 'info' | 'ok' | 'error' | 'warn';

export interface Toast {
	id: number;
	title: string;
	detail?: string;
	tone: Tone;
}

let next = 1;

class Toasts {
	list = $state<Toast[]>([]);

	show(title: string, detail?: string, tone: Tone = 'info') {
		const id = next++;
		this.list.push({ id, title, detail, tone });
		setTimeout(() => this.dismiss(id), tone === 'error' ? 9000 : 4000);
	}

	ok(title: string, detail?: string) {
		this.show(title, detail, 'ok');
	}

	error(title: string, error?: unknown) {
		this.show(title, error === undefined ? undefined : errorMessage(error), 'error');
	}

	dismiss(id: number) {
		this.list = this.list.filter((toast) => toast.id !== id);
	}
}

export function errorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	return 'Unknown error';
}

export const toasts = new Toasts();
