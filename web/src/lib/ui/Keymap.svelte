<script lang="ts">
	import { ui } from '../state/ui.svelte';
	import Modal from './Modal.svelte';

	const close = () => (ui.keymapOpen = false);
	const groups: [string, [string, string][]][] = [
		['Move', [['j / k', 'down / up'], ['gg / G', 'first / last'], ['ctrl-d / ctrl-u', 'half a page'], ['enter', 'open'], ['ctrl-o', 'back']]],
		['Go to', [['gi', 'inbox'], ['gv', 'invoices'], ['gc', 'clients'], ['gb', 'books'], ['gt', 'bank'], ['gk', 'costs'], ['gx', 'taxes'], ['ga', 'agents'], ['gs', 'company'], ['gC', 'switch company']]],
		['On the row', [['n', 'new invoice'], ['c', 'new client'], ['e', 'edit'], ['D', 'duplicate'], ['p', 'print / PDF'], ['a / x', 'approve / dismiss'], ['m', 'mark paid'], ['yy', 'copy number'], ['dd', 'delete draft']]],
		['Modes', [['/', 'search'], [': or ⌘K', 'command'], ['esc', 'leave a field'], ['t', 'test mode'], ['T', 'theme: light / dark / hacker'], ['⌘S', 'save'], ['⌘↵', 'send to KSeF'], ['?', 'this help']]]
	];
	const syntax = ['client:acmenad', 'is:unpaid', 'is:overdue', 'is:draft', 'is:approval', 'in:ksef', 'by:agent', 'month:2026-10', 'year:2025', '>10000', 'cur:EUR', '-is:paid'];
</script>

<Modal title="Keyboard shortcuts" onclose={close} width="max-w-4xl" top="pt-[8vh]">
	<div class="overflow-y-auto p-6">
		<div class="mb-5 flex flex-wrap items-baseline gap-3">
			<h2 class="text-lg font-semibold">Keys</h2>
			<p class="text-muted">Vim-style. Work everywhere outside text fields; esc leaves a field.</p>
		</div>
		<div class="grid grid-cols-4 gap-6 max-md:grid-cols-2 max-sm:grid-cols-1">
			{#each groups as [title, rows] (title)}
				<section>
					<h3 class="label-caps mb-2.5">{title}</h3>
					<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
						{#each rows as [key, what] (key)}
							<dt class="font-mono text-xs leading-5 whitespace-nowrap">{key}</dt>
							<dd>{what}</dd>
						{/each}
					</dl>
				</section>
			{/each}
		</div>
		<section class="mt-6 border-t border-line pt-4">
			<h3 class="label-caps mb-2.5">Search syntax</h3>
			<div class="flex flex-wrap gap-2 font-mono text-xs">
				{#each syntax as token (token)}<span class="rounded bg-sunken px-2 py-1">{token}</span>{/each}
			</div>
		</section>
	</div>
</Modal>
