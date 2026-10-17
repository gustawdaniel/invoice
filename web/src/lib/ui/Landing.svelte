<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';

	const steps = [
		{
			n: '1',
			title: 'Connect an agent',
			text: 'Create a key and add the openinvoice MCP server to Claude Code, Claude Desktop or any MCP client. One command.'
		},
		{
			n: '2',
			title: 'It drafts',
			text: 'Give it a contract, an email or a timesheet. It finds the client in the MF White List, writes the invoice and checks it in KSeF DEMO.'
		},
		{
			n: '3',
			title: 'You approve',
			text: 'Nothing legally binding happens without you. One key sends the invoice to KSeF; the number and the QR code land on the PDF.'
		}
	];

	const features = [
		{
			shot: 'palette',
			w: 1680,
			h: 800,
			title: 'Type what you mean',
			text: '⌘K opens one box for everything. “fv acme 12000 net october” becomes a prefilled draft: client, amount, sale date, VAT and your company defaults. Search with filters like is:overdue or client:acme.',
			alt: 'Command palette turning a typed sentence into a draft invoice'
		},
		{
			shot: 'editor',
			w: 2520,
			h: 1240,
			title: 'See the PDF while you write',
			text: 'The A4 preview follows every keystroke. Polish invoices carry exactly what art. 106e of the VAT act asks for; English ones get amounts in words and signatures.',
			alt: 'Invoice editor with a live A4 preview'
		},
		{
			shot: 'inbox',
			w: 2520,
			h: 1000,
			title: 'An inbox for decisions',
			text: 'Agent requests, KSeF rejections, overdue invoices: everything that needs a human, most urgent first. a approves, x dismisses, m marks paid.',
			alt: 'Inbox listing agent requests and overdue invoices'
		},
		{
			shot: 'books',
			w: 2520,
			h: 1040,
			title: 'Books at a glance',
			text: 'What was paid and what is still waiting, month by month, in your currency at the ECB rate. Print a whole month for your accountant with one key.',
			alt: 'Monthly chart of paid and waiting amounts with a table of invoices'
		},
		{
			shot: 'agents',
			w: 2520,
			h: 1080,
			title: 'Agents on a short leash',
			text: 'Every key is yours to revoke. Agents read, draft and test; production KSeF, NIP changes and KSeF connections stay human-only.',
			alt: 'Agents page with MCP keys, approvals and agent activity'
		}
	];

	const keys = [
		['⌘K', 'everything'],
		['j / k', 'move'],
		['n', 'new invoice'],
		['a', 'approve'],
		['p', 'PDF'],
		['/', 'search'],
		['t', 'test mode'],
		['?', 'all keys']
	];
</script>

<svelte:head>
	<title>openinvoice — invoices your agents draft and you approve</title>
	<meta name="description" content="Polish KSeF and international invoices. AI agents draft them through MCP, you approve with one key. Keyboard first, with a test mode on KSeF DEMO." />
</svelte:head>

{#snippet shot(name: string, alt: string, w = 2880, h = 1800, eager = false)}
	<img src="/landing/{name}-light.webp" {alt} width={w} height={h} loading={eager ? 'eager' : 'lazy'} class="only-light block h-auto w-full" />
	<img src="/landing/{name}-dark.webp" {alt} width={w} height={h} loading={eager ? 'eager' : 'lazy'} class="only-dark h-auto w-full" />
{/snippet}

<div class="min-h-dvh bg-bg text-ink">
	<header class="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
		<nav class="mx-auto flex max-w-6xl items-center gap-5 px-4 py-3 sm:px-6" aria-label="Main">
			<a href="/" class="font-mono text-[15px] font-medium tracking-tight">open<span class="text-accent">invoice</span></a>
			<div class="hidden gap-5 text-[13px] text-muted sm:flex">
				<a href="#how" class="hover:text-ink">How it works</a>
				<a href="#features" class="hover:text-ink">Features</a>
				<a href="#ksef" class="hover:text-ink">KSeF</a>
			</div>
			<div class="ml-auto flex items-center gap-2">
				<ThemeToggle />
				<a href="/login" class="btn-primary">Log in</a>
			</div>
		</nav>
	</header>

	<main>
		<section class="mx-auto max-w-6xl px-4 pt-16 pb-10 sm:px-6 sm:pt-24">
			<p class="font-mono text-xs text-accent">Polish KSeF · international · MCP</p>
			<h1 class="mt-4 max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-6xl">Invoices your agents draft and you approve.</h1>
			<p class="mt-5 max-w-2xl text-lg text-muted">
				openinvoice issues invoices for Polish KSeF and for clients abroad. Connect Claude or any MCP agent: it reads your contracts, drafts the
				invoices and asks before anything legally binding. You decide with one key.
			</p>
			<div class="mt-8 flex flex-wrap items-center gap-3">
				<a href="/login" class="btn-primary h-11 px-5 text-[15px]">Start with Google</a>
				<a href="#how" class="btn h-11 px-5 text-[15px]">See how it works</a>
			</div>
		</section>

		<section class="mx-auto max-w-6xl px-4 sm:px-6" aria-label="Screenshot of the invoice list">
			<div class="overflow-hidden rounded-xl border border-line shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)]">
				{@render shot('invoices', 'Invoice list with a request from an agent waiting for approval', 2880, 1800, true)}
			</div>
			<p class="mt-3 text-center text-xs text-faint">Sample data. Every company, client and number on this page is made up.</p>
		</section>

		<section id="how" class="mx-auto max-w-6xl scroll-mt-20 px-4 pt-24 sm:px-6">
			<h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
			<ol class="mt-8 grid grid-cols-3 gap-5 max-md:grid-cols-1">
				{#each steps as step (step.n)}
					<li class="rounded-xl border border-line bg-panel p-5">
						<span class="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft font-mono text-sm font-medium text-accent-ink">{step.n}</span>
						<h3 class="mt-4 font-semibold">{step.title}</h3>
						<p class="mt-1.5 text-[14px] text-muted">{step.text}</p>
					</li>
				{/each}
			</ol>
			<div class="mt-5 overflow-x-auto rounded-xl border border-line bg-[#1c1917] px-5 py-4 font-mono text-[13px] text-[#f5f5f4]">
				<p class="whitespace-nowrap"><span class="opacity-60">$</span> claude mcp add --transport http openinvoice https://api.openinvoice.in/mcp --header "Authorization: Bearer oi_…"</p>
				<p class="mt-2 whitespace-nowrap opacity-70">› Invoice Acme for October per the attached contract, then ask me to send it.</p>
			</div>
		</section>

		<section id="features" class="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-20 px-4 pt-24 sm:px-6">
			{#each features as feature (feature.shot)}
				<article class="flex flex-col gap-6">
					<div class="grid grid-cols-[2fr_3fr] items-baseline gap-x-10 gap-y-2 max-md:grid-cols-1">
						<h2 class="text-2xl font-semibold tracking-tight">{feature.title}</h2>
						<p class="text-[15px] leading-relaxed text-muted">{feature.text}</p>
					</div>
					<div class={['overflow-hidden rounded-xl border border-line shadow-[0_20px_60px_-24px_rgba(0,0,0,0.3)]', feature.shot === 'palette' && 'mx-auto w-full max-w-3xl']}>
						{@render shot(feature.shot, feature.alt, feature.w, feature.h)}
					</div>
				</article>
			{/each}
		</section>

		<section class="mx-auto max-w-6xl px-4 pt-24 sm:px-6" aria-labelledby="keyboard">
			<div class="rounded-xl border border-line bg-panel p-6 sm:p-8">
				<h2 id="keyboard" class="text-2xl font-semibold tracking-tight">Never reach for the mouse</h2>
				<p class="mt-2 max-w-2xl text-[15px] text-muted">Vim-style keys everywhere, a status line that shows the mode, and ? when you forget. The mouse still works.</p>
				<dl class="mt-6 grid grid-cols-4 gap-x-6 gap-y-3 max-md:grid-cols-2">
					{#each keys as [key, what] (key)}
						<div class="flex items-baseline gap-3">
							<dt><kbd class="rounded-md border border-line bg-sunken px-2 py-1 font-mono text-xs text-ink">{key}</kbd></dt>
							<dd class="text-[14px] text-muted">{what}</dd>
						</div>
					{/each}
				</dl>
			</div>
		</section>

		<section id="ksef" class="mx-auto grid max-w-6xl scroll-mt-20 grid-cols-3 gap-5 px-4 pt-24 sm:px-6 max-md:grid-cols-1">
			<div class="col-span-3 max-md:col-span-1">
				<h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">Built for KSeF, not bolted on</h2>
				<p class="mt-2 max-w-2xl text-[15px] text-muted">The National e-Invoice System of the Polish Ministry of Finance, with the parts that make it bearable.</p>
			</div>
			<div class="rounded-xl border border-line bg-panel p-5">
				<h3 class="font-semibold">Test mode on KSeF DEMO</h3>
				<p class="mt-1.5 text-[14px] text-muted">Like test keys in a payment API: separate test invoices sent to the Ministry's pre-production KSeF, with your real NIP and no legal effect.</p>
			</div>
			<div class="rounded-xl border border-line bg-panel p-5">
				<h3 class="font-semibold">Connect once</h3>
				<p class="mt-1.5 text-[14px] text-muted">Paste a KSeF token or sign one request with Profil Zaufany. Tokens are stored encrypted, one per environment, per company.</p>
			</div>
			<div class="rounded-xl border border-line bg-panel p-5">
				<h3 class="font-semibold">FA(3), QR and the rest</h3>
				<p class="mt-1.5 text-[14px] text-muted">Invoices are built as FA(3) XML, sent, and printed with the KSeF number and verification QR code. Several companies, PL and abroad, in one account.</p>
			</div>
		</section>

		<section class="mx-auto max-w-6xl px-4 pt-24 pb-24 sm:px-6">
			<div class="flex flex-wrap items-center gap-6 rounded-xl bg-accent-soft p-8 sm:p-10">
				<div class="min-w-0 flex-[1_1_320px]">
					<h2 class="text-2xl font-semibold tracking-tight text-accent-ink">Let the agent do the typing.</h2>
					<p class="mt-2 text-[15px] text-accent-ink/80">Sign in with Google, add your company, and connect KSeF when you are ready.</p>
				</div>
				<a href="/login" class="btn-primary h-11 px-5 text-[15px]">Start with Google</a>
			</div>
		</section>
	</main>

	<footer class="border-t border-line">
		<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-xs text-muted sm:px-6">
			<span class="font-mono">open<span class="text-accent">invoice</span></span>
			<span>Screenshots show sample data.</span>
			<a href="/login" class="ml-auto hover:text-ink">Log in</a>
		</div>
	</footer>
</div>
