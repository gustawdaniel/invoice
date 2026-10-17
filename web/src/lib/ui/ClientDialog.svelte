<script lang="ts">
	import { isValidNip } from '../invoice';
	import { data } from '../state/data.svelte';
	import { keys } from '../state/keys.svelte';
	import { toasts } from '../state/toast.svelte';
	import { ui } from '../state/ui.svelte';
	import type { Client } from '../types';
	import Kbd from './Kbd.svelte';
	import Modal from './Modal.svelte';

	let { onsaved }: { onsaved?: (client: Client) => void } = $props();

	// a copy, the dialog edits it and saves on submit
	let client = $state<Client>({ ...ui.client! });
	let busy = $state(false);
	let looking = $state(false);
	let nipInput: HTMLInputElement | undefined = $state();
	const isNew = !client.id;
	const close = () => {
		ui.client = null;
		ui.clientSaved = null;
	};

	$effect(() => {
		nipInput?.focus();
	});

	async function lookup() {
		if (!isValidNip(client.tin)) {
			toasts.show('Enter a valid NIP first', '10 digits with a correct checksum', 'warn');
			return;
		}
		looking = true;
		try {
			const found = await data.lookupNip(client.tin);
			Object.assign(client, { name: found.name, street: found.street, post: found.post, city: found.city, tin: found.nip, tinName: 'NIP', country: 'Poland' });
			toasts.ok('Filled from the MF White List', `VAT status: ${found.statusVat}`);
		} catch (error) {
			toasts.error('MF lookup failed', error);
		} finally {
			looking = false;
		}
	}

	async function submit(event?: SubmitEvent) {
		event?.preventDefault();
		if (!client.name.trim()) {
			toasts.show('The client needs a name', undefined, 'warn');
			return;
		}
		busy = true;
		try {
			const saved = await data.saveClient(client);
			toasts.ok(isNew ? 'Client added' : 'Client saved', saved.name);
			onsaved?.(saved);
			ui.clientSaved?.(saved);
			close();
		} catch (error) {
			toasts.error('Could not save the client', error);
		} finally {
			busy = false;
		}
	}

	$effect(() => keys.use({ 'mod-s': () => submit(), 'mod-enter': () => submit(), escape: close }, { exclusive: true }));
</script>

<Modal title={isNew ? 'New client' : 'Edit client'} onclose={close}>
	<form class="flex flex-col gap-4 p-5" onsubmit={submit}>
		<h2 class="text-base font-semibold">{isNew ? 'New client' : 'Edit client'}</h2>
		<div>
			<label for="client-tin" class="mb-1 block text-xs text-muted">{client.tinName || 'NIP'}</label>
			<div class="flex gap-2">
				<input id="client-tin" bind:this={nipInput} bind:value={client.tin} class="field font-mono" placeholder="1133022863" autocomplete="off" />
				<button type="button" class="btn whitespace-nowrap" disabled={looking} onclick={lookup}>{looking ? 'Looking up…' : 'Fill from MF'}</button>
			</div>
			<p class="mt-1 text-xs text-muted">For Polish companies the White List fills the rest. About 10 lookups a day.</p>
		</div>
		<div>
			<label for="client-name" class="mb-1 block text-xs text-muted">Name</label>
			<input id="client-name" bind:value={client.name} class="field" required />
		</div>
		<div class="grid grid-cols-[2fr_1fr_1.5fr] gap-3 max-sm:grid-cols-1">
			<div>
				<label for="client-street" class="mb-1 block text-xs text-muted">Street</label>
				<input id="client-street" bind:value={client.street} class="field" />
			</div>
			<div>
				<label for="client-post" class="mb-1 block text-xs text-muted">Postcode</label>
				<input id="client-post" bind:value={client.post} class="field font-mono" />
			</div>
			<div>
				<label for="client-city" class="mb-1 block text-xs text-muted">City</label>
				<input id="client-city" bind:value={client.city} class="field" />
			</div>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="client-country" class="mb-1 block text-xs text-muted">Country</label>
				<input id="client-country" bind:value={client.country} class="field" />
			</div>
			<div>
				<label for="client-tin-name" class="mb-1 block text-xs text-muted">Tax ID label</label>
				<input id="client-tin-name" bind:value={client.tinName} class="field" placeholder="NIP, VAT, Company No." />
			</div>
		</div>
		<div class="flex items-center justify-end gap-2 pt-1">
			<span class="mr-auto text-xs text-muted"><Kbd keys="⌘S" /> save · <Kbd keys="esc" /> cancel</span>
			<button type="button" class="btn" onclick={close}>Cancel</button>
			<button type="submit" class="btn-primary" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Add client' : 'Save'}</button>
		</div>
	</form>
</Modal>
