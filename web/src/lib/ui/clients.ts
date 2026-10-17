import { emptyClient } from '../invoice';
import { ui } from '../state/ui.svelte';
import type { Client } from '../types';

export function newClient(onsaved?: (client: Client) => void) {
	ui.clientSaved = onsaved ?? null;
	ui.client = emptyClient();
}

export function editClient(client: Client) {
	ui.client = { ...client };
}
