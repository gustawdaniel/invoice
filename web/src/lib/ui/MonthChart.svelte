<script lang="ts" module>
	export interface MonthBar {
		month: string; // YYYY-MM
		label: string;
		paid: number;
		waiting: number;
	}
</script>

<script lang="ts">
	import { money } from '../invoice';

	let { bars, currency, lang, selected, onselect }: { bars: MonthBar[]; currency: string; lang: 'pl' | 'en'; selected: string; onselect: (month: string) => void } = $props();

	let viewport = $state(640);
	let scroller: HTMLDivElement | undefined = $state();
	let hover = $state<MonthBar | null>(null);
	const height = 200;
	const axisW = 52;
	const pad = { top: 12, bottom: 22 };
	const plotH = height - pad.top - pad.bottom;

	const max = $derived(Math.max(1, ...bars.map((b) => b.paid + b.waiting)));
	// a round axis maximum: 1, 2 or 5 × 10^n
	const top = $derived.by(() => {
		const power = 10 ** Math.floor(Math.log10(max));
		return [1, 2, 5, 10].map((m) => m * power).find((v) => v >= max) ?? max;
	});
	const ticks = $derived([0, top / 2, top]);
	// a month keeps its width; older months are a scroll away instead of squeezed in
	const band = $derived(Math.max(56, (viewport - axisW) / Math.max(1, bars.length)));
	const plotW = $derived(band * bars.length);
	const barW = $derived(Math.min(24, band * 0.6));
	const y = (value: number) => pad.top + plotH - (value / top) * plotH;
	const short = (value: number) => (value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(Math.round(value)));
	const yearOf = (month: string) => month.slice(0, 4);

	// a rounded data end (4px) and a square baseline
	function bar(x: number, y0: number, y1: number, rounded: boolean): string {
		const h = y0 - y1;
		if (h <= 0) return '';
		const r = rounded ? Math.min(4, h, barW / 2) : 0;
		return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + barW - r}Q${x + barW},${y1} ${x + barW},${y1 + r}V${y0}Z`;
	}

	// start at the newest months, then keep the selected month in view
	let started = false;
	$effect(() => {
		if (!scroller || !bars.length) return;
		const index = bars.findIndex((b) => b.month === selected);
		if (!started) {
			scroller.scrollLeft = scroller.scrollWidth;
			started = true;
		}
		if (index < 0) return;
		const left = index * band;
		if (left < scroller.scrollLeft) scroller.scrollTo({ left: left - band, behavior: 'smooth' });
		else if (left + band > scroller.scrollLeft + scroller.clientWidth) scroller.scrollTo({ left: left + 2 * band - scroller.clientWidth, behavior: 'smooth' });
	});
</script>

<div class="viz" bind:clientWidth={viewport}>
	<div class="mb-2 flex flex-wrap items-center gap-4 text-xs text-muted">
		<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm" style:background="var(--series-1)"></span>Paid</span>
		<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm" style:background="var(--series-2)"></span>Waiting for payment</span>
		<span class="ml-auto">by issue month, in {currency} · scroll for older months</span>
	</div>
	<div class="flex">
		<svg width={axisW} {height} class="shrink-0" aria-hidden="true">
			{#each ticks as tick (tick)}
				<text x={axisW - 8} y={y(tick)} dy="0.32em" text-anchor="end" class="fill-faint font-mono text-[10px]">{short(tick)}</text>
			{/each}
		</svg>
		<div bind:this={scroller} class="relative min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
			<svg width={plotW} {height} role="img" aria-label="Paid and waiting amounts per month, {bars[0]?.month} to {bars.at(-1)?.month}">
				{#each ticks as tick (tick)}
					<line x1="0" x2={plotW} y1={y(tick)} y2={y(tick)} stroke="var(--line)" stroke-width="1" />
				{/each}
				{#each bars as b, i (b.month)}
					{@const x = i * band + (band - barW) / 2}
					{@const paidTop = y(b.paid)}
					{@const waitTop = y(b.paid + b.waiting)}
					<!-- January carries the year, so a scrolled chart still says when it is -->
					{#if i === 0 || b.month.endsWith('-01')}
						<line x1={i * band} x2={i * band} y1={pad.top} y2={pad.top + plotH} stroke="var(--line)" stroke-dasharray="2 3" />
						<text x={i * band + 4} y={pad.top + 8} class="fill-faint font-mono text-[10px]">{yearOf(b.month)}</text>
					{/if}
					<path d={bar(x, y(0), paidTop, b.waiting <= 0)} fill="var(--series-1)" />
					<!-- the gap between the segments is 2px of surface -->
					<path d={bar(x, paidTop - (b.paid > 0 ? 2 : 0), waitTop, true)} fill="var(--series-2)" />
					<text x={x + barW / 2} y={height - 6} text-anchor="middle" class={['text-[10px]', b.month === selected ? 'fill-ink font-semibold' : 'fill-faint']}>{b.label}</text>
					{#if b.month === selected}<line x1={i * band + 4} x2={(i + 1) * band - 4} y1={height - 1} y2={height - 1} stroke="var(--ink)" stroke-width="2" />{/if}
					<!-- the hover and click target is the whole band, bigger than the bar -->
					<rect
						role="button"
						tabindex="-1"
						aria-label="{b.label} {yearOf(b.month)}: paid {money(b.paid, lang)}, waiting {money(b.waiting, lang)} {currency}"
						x={i * band}
						y={pad.top}
						width={band}
						height={plotH + pad.bottom}
						fill="transparent"
						class="cursor-pointer"
						onmouseenter={() => (hover = b)}
						onmouseleave={() => (hover = null)}
						onclick={() => onselect(b.month)}
						onkeydown={() => {}}
					/>
				{/each}
			</svg>
			{#if hover}
				{@const i = bars.indexOf(hover)}
				<div class="pointer-events-none absolute top-2 z-10 w-40 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs shadow-md" style:left="{Math.min(plotW - 164, Math.max(0, i * band + band / 2 - 80))}px">
					<p class="font-medium">{hover.label} {yearOf(hover.month)}</p>
					<p class="mt-0.5 flex justify-between gap-4"><span class="text-muted">Paid</span><span class="font-mono">{money(hover.paid, lang)}</span></p>
					<p class="flex justify-between gap-4"><span class="text-muted">Waiting</span><span class="font-mono">{money(hover.waiting, lang)}</span></p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* palette slots 1 and 2 of the validated categorical palette, stepped per theme */
	.viz {
		--series-1: #2a78d6;
		--series-2: #eb6834;
	}
	:global(:root[data-theme='dark']) .viz {
		--series-1: #3987e5;
		--series-2: #d95926;
	}
	/* green for paid stays the terminal's colour; violet keeps it apart for colour-blind readers */
	:global(:root[data-theme='hacker']) .viz {
		--series-1: #16a34a;
		--series-2: #9085e9;
	}
</style>
