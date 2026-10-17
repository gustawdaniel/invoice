import type { Client, Invoice } from '../types';

// overlays and hand-offs between screens
class Ui {
	paletteOpen = $state(false);
	// text the palette opens with, e.g. ":" for commands
	paletteSeed = $state('');
	keymapOpen = $state(false);
	// client being added or edited in the client dialog
	client = $state<Client | null>(null);
	// who gets the client once the dialog saves it (the invoice editor picks it as the buyer)
	clientSaved: ((client: Client) => void) | null = null;
	// a prefilled draft for /invoices/new (from the palette or a duplicate)
	draft = $state<Invoice | null>(null);
	// what the status line says about the screen, e.g. "invoices 3/42"
	context = $state('');
	hints = $state('');

	openPalette(seed = '') {
		this.paletteSeed = seed;
		this.paletteOpen = true;
	}
}

export const ui = new Ui();
