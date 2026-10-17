// Vim-like key bindings. Screens push a layer of bindings while mounted; a modal layer is
// exclusive, so the screen below does not react. Keys are named like "j", "G", "gg", "ctrl-d",
// "mod-k" (⌘ on a Mac, ctrl elsewhere), "enter", "escape". Inside a text field only "mod-…",
// "ctrl-…" and "escape" bindings fire, everything else is typing.
export type Handler = (event: KeyboardEvent) => unknown;
export type Bindings = Record<string, Handler>;

interface Layer {
	bindings: Bindings;
	exclusive: boolean;
}

const SEQUENCE_TIMEOUT = 1000;

export function isTyping(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
	if (target instanceof HTMLInputElement) {
		return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color'].includes(target.type);
	}
	return false;
}

function names(event: KeyboardEvent): string[] {
	const key = event.key.length === 1 ? event.key : event.key.toLowerCase();
	if (event.metaKey) return [`mod-${key.toLowerCase()}`];
	// ctrl-k works like ⌘K off a Mac, ctrl-d stays ctrl-d
	if (event.ctrlKey) return [`ctrl-${key.toLowerCase()}`, `mod-${key.toLowerCase()}`];
	if (event.altKey) return [];
	return [key];
}

class Keys {
	mode = $state<'NORMAL' | 'INSERT'>('NORMAL');
	pending = $state('');
	private layers: Layer[] = [];
	private timer: ReturnType<typeof setTimeout> | undefined;

	use(bindings: Bindings, options: { exclusive?: boolean } = {}): () => void {
		const layer = { bindings, exclusive: options.exclusive ?? false };
		this.layers.push(layer);
		return () => {
			this.layers = this.layers.filter((l) => l !== layer);
		};
	}

	// top layer first, down to (and including) the first exclusive one
	private active(): Bindings[] {
		const result: Bindings[] = [];
		for (let i = this.layers.length - 1; i >= 0; i--) {
			result.push(this.layers[i].bindings);
			if (this.layers[i].exclusive) break;
		}
		return result;
	}

	private find(name: string): Handler | undefined {
		for (const bindings of this.active()) if (bindings[name]) return bindings[name];
	}

	private isPrefix(sequence: string): boolean {
		return this.active().some((bindings) =>
			Object.keys(bindings).some((key) => key.length > sequence.length && key.startsWith(sequence))
		);
	}

	private clearPending() {
		this.pending = '';
		clearTimeout(this.timer);
	}

	handle = (event: KeyboardEvent) => {
		if (event.isComposing || ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
		const typing = isTyping(event.target);

		for (const name of names(event)) {
			const anywhere = name.startsWith('mod-') || name.startsWith('ctrl-') || name === 'escape';
			if (typing && !anywhere) continue;

			const sequence = this.pending + name;
			const handler = this.find(sequence);
			if (handler) {
				event.preventDefault();
				this.clearPending();
				void handler(event);
				return;
			}
			if (name.length === 1 && this.isPrefix(sequence)) {
				event.preventDefault();
				this.pending = sequence;
				clearTimeout(this.timer);
				this.timer = setTimeout(() => this.clearPending(), SEQUENCE_TIMEOUT);
				return;
			}
			if (this.pending) {
				// not a known sequence: start over from this key alone
				this.clearPending();
				const single = this.find(name);
				if (single) {
					event.preventDefault();
					void single(event);
					return;
				}
			}
		}

		// esc leaves a text field, like leaving insert mode
		if (typing && event.key === 'Escape' && event.target instanceof HTMLElement) event.target.blur();
	};

	track = () => {
		this.mode = isTyping(document.activeElement) ? 'INSERT' : 'NORMAL';
	};
}

export const keys = new Keys();
