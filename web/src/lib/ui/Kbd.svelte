<script lang="ts">
	let { keys, tone = 'muted' }: { keys: string; tone?: 'muted' | 'inverse' | 'accent' } = $props();
</script>

<kbd
	class={[
		'font-mono text-[11px] leading-none',
		tone === 'muted' && 'text-faint',
		tone === 'inverse' && 'text-on-accent/80',
		tone === 'accent' && 'text-accent-ink'
	]}>{keys}</kbd
>
