<script lang="ts">
	import { toasts } from '../state/toast.svelte';
</script>

<div class="no-print pointer-events-none fixed right-4 bottom-10 z-50 flex w-[min(380px,calc(100vw-32px))] flex-col gap-2" aria-live="polite">
	{#each toasts.list as toast (toast.id)}
		<div
			class={[
				'pointer-events-auto rounded-lg border bg-panel px-3 py-2.5 shadow-lg',
				toast.tone === 'error' && 'border-bad/40',
				toast.tone === 'ok' && 'border-ok/40',
				toast.tone === 'warn' && 'border-warn/40',
				toast.tone === 'info' && 'border-line'
			]}
			role={toast.tone === 'error' ? 'alert' : 'status'}
		>
			<div class="flex items-start gap-2">
				<div class="min-w-0 flex-1">
					<p class={['text-sm font-medium', toast.tone === 'error' && 'text-bad', toast.tone === 'ok' && 'text-ok']}>{toast.title}</p>
					{#if toast.detail}<p class="mt-0.5 text-xs break-words text-muted">{toast.detail}</p>{/if}
				</div>
				<button class="rounded px-1 text-faint hover:text-ink" aria-label="Dismiss" onclick={() => toasts.dismiss(toast.id)}>×</button>
			</div>
		</div>
	{/each}
</div>
