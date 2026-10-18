<script lang="ts">
	import { isValidNip } from '#lib/invoice.js';
	import { data } from '#lib/state/data.svelte.js';
	import { keys } from '#lib/state/keys.svelte.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import type { Company, Country } from '#lib/types.js';
	import Kbd from '#lib/ui/Kbd.svelte';
	import KsefConnection from '#lib/ui/KsefConnection.svelte';

	let form = $state<Company>({ ...data.company });
	let busy = $state(false);
	let looking = $state(false);
	let newName = $state('');
	let newCountry = $state<Country>('PL');

	// another company selected from the palette
	$effect(() => {
		if (form.id !== data.company.id) form = { ...data.company };
	});

	const pl = $derived(form.country === 'PL');
	const dirty = $derived(JSON.stringify(form) !== JSON.stringify(data.company));
	const steps = $derived([
		{ done: isValidNip(data.company.tin), label: 'NIP' },
		{ done: Boolean(data.company.address), label: 'Address' },
		{ done: data.company.ksefConnected, label: 'KSeF production connected' },
		{ done: data.company.ksefDemoConnected, label: 'KSeF DEMO connected (optional, for test mode)', optional: true }
	]);
	const ready = $derived(steps.every((s) => s.done || s.optional));

	async function save(event?: SubmitEvent) {
		event?.preventDefault();
		if (!form.name.trim()) return toasts.show('The company needs a name', undefined, 'warn');
		if (pl && form.tin && !isValidNip(form.tin)) return toasts.show('Invalid NIP', '10 digits with a correct checksum.', 'warn');
		if (pl && form.tin !== data.company.tin && (data.company.ksefConnected || data.company.ksefDemoConnected)) {
			toasts.show('Changing the NIP disconnects KSeF', 'Both KSeF tokens belong to the old NIP.', 'warn');
		}
		busy = true;
		try {
			await data.saveCompany(form);
			form = { ...data.company };
			toasts.ok('Company saved');
		} catch (error) {
			toasts.error('Could not save', error);
		} finally {
			busy = false;
		}
	}

	async function fillFromMf() {
		if (!isValidNip(form.tin)) return toasts.show('Enter a valid NIP first', undefined, 'warn');
		looking = true;
		try {
			const found = await data.lookupNip(form.tin);
			form.name = found.name;
			form.address = found.address;
			form.tin = found.nip;
			let detail = `VAT status: ${found.statusVat}.`;
			if (found.statusVat !== 'Czynny' && !form.vatExemptionBasis) {
				form.vatExemptionBasis = 'Art. 113 ust. 1 ustawy o VAT';
				detail += ' Not an active VAT payer: the art. 113 exemption was filled in, check it.';
			}
			toasts.ok('Filled from the MF White List', `${detail} Save to keep it.`);
		} catch (error) {
			toasts.error('MF lookup failed', error);
		} finally {
			looking = false;
		}
	}

	async function upload(event: Event, field: 'logo' | 'signature') {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		form[field] = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	async function addCompany(event: SubmitEvent) {
		event.preventDefault();
		if (!newName.trim()) return;
		try {
			await data.addCompany(newName.trim(), newCountry);
			newName = '';
			toasts.ok('Company added', 'Now fill in its details.');
		} catch (error) {
			toasts.error('Could not add the company', error);
		}
	}

	async function makeDefault() {
		try {
			await data.setDefaultCompany(data.company.id);
			toasts.ok('Default company', `${data.company.name} opens after login.`);
		} catch (error) {
			toasts.error('Could not change the default', error);
		}
	}

	$effect(() => keys.use({ 'mod-s': () => save() }));
</script>

<svelte:head><title>Company · openinvoice</title></svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 pt-4 pb-10">
	<div class="flex flex-wrap items-center gap-2">
		<h1 class="text-lg font-semibold">Company</h1>
		<span class="text-[13px] text-muted">settings of {data.company.name}</span>
		{#if data.companies.length > 1}
			{#if data.defaultCompany?.id === data.company.id}
				<span class="ml-auto rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-ink" title="Opens after login">Default company</span>
			{:else}
				<button class="btn ml-auto" onclick={makeDefault} title="This company opens after login">Make it my default</button>
			{/if}
		{/if}
	</div>

	{#if data.company.country === 'PL'}
		<section class={['rounded-lg border p-4 text-[13px]', ready ? 'border-ok/30 bg-ok-soft' : 'border-warn/30 bg-warn-soft']}>
			<p class="mb-1 font-semibold">{ready ? 'Ready to send invoices to KSeF' : 'KSeF setup'}</p>
			<ul class="flex flex-col gap-0.5">
				{#each steps as step (step.label)}<li>{step.done ? '✓' : '○'} {step.label}</li>{/each}
			</ul>
		</section>
	{/if}

	<form class="flex flex-col gap-4 rounded-lg border border-line bg-panel p-5" onsubmit={save}>
		<div class="grid grid-cols-[1fr_auto] gap-3 max-sm:grid-cols-1">
			<div>
				<label for="c-name" class="mb-1 block text-xs text-muted">Name</label>
				<input id="c-name" bind:value={form.name} class="field" />
			</div>
			<div>
				<label for="c-country" class="mb-1 block text-xs text-muted">Country</label>
				<select id="c-country" bind:value={form.country} class="field">
					<option value="PL">Poland (KSeF)</option>
					<option value="GE">Georgia (no KSeF)</option>
					<option value="GB">United Kingdom (no KSeF)</option>
				</select>
			</div>
		</div>
		<div>
			<label for="c-status" class="mb-1 block text-xs text-muted">Status</label>
			<select id="c-status" bind:value={form.status} class="field max-w-xs">
				<option value="active">Active</option>
				<option value="suspended">Suspended</option>
				<option value="closed">Closed</option>
				<option value="dissolved">Dissolved</option>
				<option value="sold">Sold</option>
			</select>
		</div>
		<div>
			<label for="c-tin" class="mb-1 block text-xs text-muted">{pl ? 'NIP' : 'Tax ID'}</label>
			<div class="flex gap-2">
				<input id="c-tin" bind:value={form.tin} class="field font-mono" />
				{#if pl}<button type="button" class="btn whitespace-nowrap" disabled={looking} onclick={fillFromMf}>{looking ? 'Looking up…' : 'Fill from MF'}</button>{/if}
			</div>
		</div>
		{#if pl}
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="c-krs" class="mb-1 block text-xs text-muted">KRS</label>
					<input id="c-krs" bind:value={form.krs} class="field font-mono" />
				</div>
				<div>
					<label for="c-regon" class="mb-1 block text-xs text-muted">REGON</label>
					<input id="c-regon" bind:value={form.regon} class="field font-mono" />
				</div>
			</div>
		{/if}
		<div>
			<label for="c-address" class="mb-1 block text-xs text-muted">Address <span class="text-faint">— street, comma, postcode and city</span></label>
			<input id="c-address" bind:value={form.address} placeholder="ul. Grzybowska 85A/32, 00-844 Warszawa" class="field" />
		</div>
		<div>
			<label for="c-info" class="mb-1 block text-xs text-muted">Extra lines under the seller {pl ? '' : '(printed instead of the NIP)'}</label>
			<textarea id="c-info" rows="2" bind:value={form.info} class="field"></textarea>
		</div>
		{#if pl}
			<div>
				<label for="c-vat" class="mb-1 block text-xs text-muted">VAT exemption basis <span class="text-faint">— required with “zw.” items, empty for VAT payers</span></label>
				<input id="c-vat" bind:value={form.vatExemptionBasis} placeholder="Art. 113 ust. 1 ustawy o VAT" class="field" />
			</div>
		{/if}

		<fieldset class="grid grid-cols-2 gap-3 rounded-md border border-line p-4 max-sm:grid-cols-1">
			<legend class="px-1 text-xs font-semibold text-muted">New invoice defaults <span class="font-normal text-faint">— empty ones come from the latest invoice</span></legend>
			<div>
				<label for="d-place" class="mb-1 block text-xs text-muted">Place of issue</label>
				<input id="d-place" bind:value={form.defaultIssuePlace} placeholder="Warszawa" class="field" />
			</div>
			<div>
				<label for="d-issuer" class="mb-1 block text-xs text-muted">Issuer</label>
				<input id="d-issuer" bind:value={form.defaultIssuerName} class="field" />
			</div>
			<div class="col-span-2 max-sm:col-span-1">
				<label for="d-account" class="mb-1 block text-xs text-muted">Bank account</label>
				<input id="d-account" bind:value={form.defaultBankAccountNumber} placeholder="PL00 0000 0000 0000 0000 0000 0000" class="field font-mono text-xs" />
			</div>
			<div class="col-span-2 max-sm:col-span-1">
				<label for="d-note" class="mb-1 block text-xs text-muted">Public note (printed)</label>
				<textarea id="d-note" rows="2" bind:value={form.defaultPublicNote} class="field"></textarea>
			</div>
		</fieldset>

		<div class="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
			<div>
				<label for="c-logo" class="mb-1 block text-xs text-muted">Logo</label>
				<input id="c-logo" type="file" accept="image/*" class="text-xs" onchange={(event) => upload(event, 'logo')} />
				{#if form.logo}<img src={form.logo} alt="Logo" class="mt-2 h-14 rounded border border-line object-contain p-1" />{/if}
			</div>
			<div>
				<label for="c-signature" class="mb-1 block text-xs text-muted">Signature (printed on invoices)</label>
				<input id="c-signature" type="file" accept="image/*" class="text-xs" onchange={(event) => upload(event, 'signature')} />
				{#if form.signature}<img src={form.signature} alt="Signature" class="mt-2 h-14 rounded border border-line bg-white object-contain p-1" />{/if}
			</div>
		</div>

		<div class="flex items-center justify-end gap-3 border-t border-line pt-4">
			{#if dirty}<span class="mr-auto text-xs text-warn">unsaved changes</span>{/if}
			<button class="btn-primary" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save'} <Kbd keys="⌘S" tone="inverse" /></button>
		</div>
	</form>

	{#if data.usesKsef}
		<div class="flex flex-col gap-3">
			<h2 class="label-caps">KSeF connections</h2>
			<KsefConnection env="prod" />
			<KsefConnection env="demo" />
			<p class="text-xs text-muted">Changing the NIP disconnects both.</p>
		</div>
	{/if}

	<section class="rounded-lg border border-line bg-panel p-4">
		<h2 class="font-semibold">Your companies</h2>
		<p class="mt-0.5 mb-3 text-[13px] text-muted">Each company has its own clients, invoices and KSeF. Switch with <span class="font-mono">gC</span>; the default one opens after login.</p>
		<ul class="mb-4 flex flex-col divide-y divide-line-soft rounded-md border border-line text-[13px]">
			{#each data.companies as company (company.id)}
				<li class="flex flex-wrap items-center gap-2 px-3 py-2">
					<span class="flex h-[18px] w-[22px] shrink-0 items-center justify-center rounded bg-ink text-[10px] font-semibold text-bg">{company.country}</span>
					<span class="min-w-0 flex-1 truncate">{company.name}</span>
					{#if company.status !== 'active'}<span class="rounded-full border border-line px-2 py-0.5 text-xs text-muted">{company.status}</span>{/if}
					{#if company.isDefault}<span class="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-ink">default</span>{/if}
					{#if company.id === data.company.id}
						<span class="text-xs text-muted">open now</span>
					{:else}
						<button class="btn h-7 text-xs" onclick={() => data.switchCompany(company.id)}>Open</button>
					{/if}
					{#if !company.isDefault}
						<button class="btn h-7 text-xs" onclick={async () => { try { await data.setDefaultCompany(company.id); toasts.ok('Default company', company.name); } catch (error) { toasts.error('Could not change the default', error); } }}>Make default</button>
					{/if}
				</li>
			{/each}
		</ul>
		<form class="flex flex-wrap gap-2" onsubmit={addCompany}>
			<label for="n-name" class="sr-only">Company name</label>
			<input id="n-name" bind:value={newName} placeholder="Company name" class="field max-w-sm flex-1" />
			<label for="n-country" class="sr-only">Country</label>
			<select id="n-country" bind:value={newCountry} class="field w-24"><option>PL</option><option>GE</option><option>GB</option></select>
			<button class="btn" disabled={!newName.trim()}>Add company</button>
		</form>
	</section>
</div>
