<script lang="ts">
	import { api } from '#lib/state/api.js';
	import { errorMessage } from '#lib/state/toast.svelte.js';

	interface AdminCompany {
		id: string;
		name: string;
		country: 'PL' | 'GE';
		tin: string;
		ksefConnected: boolean;
		ksefDemoConnected: boolean;
		createdAt: string;
		users: { email: string; lastVerifiedAt: string | null }[];
		invoices: number;
		pendingKsefRequests: number;
	}

	let companies = $state<AdminCompany[]>([]);
	let error = $state('');
	let filter = $state('');

	$effect(() => {
		api<AdminCompany[]>('/admin/companies')
			.then((list) => (companies = list))
			.catch((e) => (error = errorMessage(e)));
	});

	const shown = $derived.by(() => {
		const q = filter.trim().toLowerCase();
		if (!q) return companies;
		return companies.filter((c) => [c.name, c.tin, ...c.users.map((u) => u.email)].some((v) => v.toLowerCase().includes(q)));
	});
	const users = $derived(new Set(companies.flatMap((c) => c.users.map((u) => u.email))).size);
	const date = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—');
</script>

<svelte:head><title>Admin · openinvoice</title></svelte:head>

<div class="flex flex-col gap-4 px-5 pt-4 pb-8">
	<div class="flex flex-wrap items-end gap-3">
		<div>
			<h1 class="text-lg font-semibold">All companies</h1>
			<p class="text-[13px] text-muted">{companies.length} companies, {users} users.</p>
		</div>
		<label class="ml-auto w-72 max-sm:w-full"><span class="sr-only">Filter</span><input bind:value={filter} type="search" placeholder="Filter by name, NIP or email" class="field" /></label>
	</div>
	{#if error}
		<p class="text-[13px] text-bad">{error}. Admin access comes from ADMIN_EMAILS; log out and in again after it changes.</p>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-line bg-panel">
			<table class="w-full min-w-[800px] border-collapse text-[13px]">
				<thead>
					<tr class="text-left text-xs text-muted">
						<th class="border-b border-line px-3 py-2 font-medium">Company</th>
						<th class="border-b border-line px-3 py-2 font-medium">NIP / TIN</th>
						<th class="border-b border-line px-3 py-2 font-medium">KSeF</th>
						<th class="border-b border-line px-3 py-2 font-medium">Users</th>
						<th class="border-b border-line px-3 py-2 text-right font-medium">Invoices</th>
						<th class="border-b border-line px-3 py-2 font-medium">Created</th>
					</tr>
				</thead>
				<tbody>
					{#each shown as company (company.id)}
						<tr class="border-t border-line-soft align-top">
							<td class="px-3 py-2">{company.name} <span class="text-xs text-faint">{company.country}</span></td>
							<td class="px-3 py-2 font-mono text-xs">{company.tin || '—'}</td>
							<td class="px-3 py-2 text-xs whitespace-nowrap">
								{#if company.country === 'PL'}
									<span class={company.ksefConnected ? 'text-ok' : 'text-faint'}>prod {company.ksefConnected ? '✓' : '—'}</span>
									<span class={['ml-2', company.ksefDemoConnected ? 'text-ok' : 'text-faint']}>demo {company.ksefDemoConnected ? '✓' : '—'}</span>
								{:else}—{/if}
								{#if company.pendingKsefRequests}<span class="ml-1 font-medium text-warn">{company.pendingKsefRequests} waiting</span>{/if}
							</td>
							<td class="px-3 py-2 text-xs">{#each company.users as user (user.email)}<div title="last login {date(user.lastVerifiedAt)}">{user.email}</div>{/each}</td>
							<td class="px-3 py-2 text-right font-mono text-xs">{company.invoices}</td>
							<td class="px-3 py-2 text-xs whitespace-nowrap">{date(company.createdAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
