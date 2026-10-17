<script lang="ts">
	import type { Snippet } from 'svelte';
	import { keys } from '../state/keys.svelte';

	let {
		title,
		onclose,
		width = 'max-w-lg',
		top = 'pt-[12vh]',
		children
	}: { title: string; onclose: () => void; width?: string; top?: string; children: Snippet } = $props();

	// the screen below stops reacting to keys while the dialog is open
	$effect(() => keys.use({ escape: () => onclose() }, { exclusive: true }));
</script>

<div class="no-print fixed inset-0 z-40 flex items-start justify-center bg-black/45 px-4 pb-8 {top}">
	<button class="absolute inset-0 cursor-default" aria-label="Close" tabindex="-1" onclick={onclose}></button>
	<div role="dialog" aria-modal="true" aria-label={title} class="relative flex max-h-full min-h-0 w-full flex-col overflow-hidden rounded-xl bg-panel shadow-2xl {width}">
		{@render children()}
	</div>
</div>
