<script lang="ts">
	import type { Snippet } from 'svelte';
	import { keys } from '../state/keys.svelte';
	import Kbd from './Kbd.svelte';
	import Modal from './Modal.svelte';

	let {
		title,
		confirmLabel,
		danger = false,
		onconfirm,
		oncancel,
		children
	}: {
		title: string;
		confirmLabel: string;
		danger?: boolean;
		onconfirm: () => void | Promise<void>;
		oncancel: () => void;
		children?: Snippet;
	} = $props();

	let busy = $state(false);

	async function confirm() {
		if (busy) return;
		busy = true;
		try {
			await onconfirm();
		} finally {
			busy = false;
		}
	}

	$effect(() => keys.use({ enter: confirm, y: confirm, n: oncancel, escape: oncancel }, { exclusive: true }));
</script>

<Modal {title} onclose={oncancel} width="max-w-md" top="pt-[18vh]">
	<div class="flex flex-col gap-3 p-5">
		<h2 class="text-base font-semibold">{title}</h2>
		{#if children}<div class="text-[13px] text-muted">{@render children()}</div>{/if}
		<div class="flex items-center justify-end gap-2 pt-2">
			<span class="mr-auto text-xs text-muted"><Kbd keys="y" /> / <Kbd keys="enter" /> yes · <Kbd keys="n" /> / <Kbd keys="esc" /> no</span>
			<button class="btn" onclick={oncancel}>Cancel</button>
			<button class={danger ? 'btn-danger' : 'btn-primary'} disabled={busy} onclick={confirm}>{busy ? 'Working…' : confirmLabel}</button>
		</div>
	</div>
</Modal>
