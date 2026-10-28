<script lang="ts">
	import { page } from '$app/state';
	import { apiDownload } from '#lib/state/api.js';
	import { data } from '#lib/state/data.svelte.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import type { CompanyDocument, DocumentKind } from '#lib/types.js';

	const kinds: { value: DocumentKind; label: string }[] = [
		{ value: 'contract', label: 'Contract' },
		{ value: 'tax', label: 'Tax / authority' },
		{ value: 'invoice', label: 'Invoice' },
		{ value: 'accounting', label: 'Accounting' },
		{ value: 'other', label: 'Other' }
	];

	const kindLabel = (kind: DocumentKind) => kinds.find((k) => k.value === kind)?.label ?? kind;
	const formatSize = (bytes: number) => {
		if (!bytes) return 'link';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	};
	const formatDate = (value: string) => value?.slice(0, 10) ?? '';

	let title = $state('');
	let kind = $state<DocumentKind>('contract');
	let url = $state('');
	let note = $state('');
	let file = $state<File | null>(null);
	let busy = $state(false);
	let loading = $state(true);
	// /documents?q=KRS 2022 opens the list filtered, so a document set can be linked from elsewhere
	let query = $state(page.url.searchParams.get('q') ?? '');

	$effect(() => {
		const companyId = data.company.id;
		if (!companyId) return;
		loading = true;
		data.loadDocuments()
			.catch((error) => toasts.error('Could not load documents', error))
			.finally(() => (loading = false));
	});

	const shown = $derived(
		data.documents.filter((doc) => {
			const text = `${doc.title} ${doc.kind} ${doc.note} ${doc.fileName}`.toLowerCase();
			return query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => text.includes(word));
		})
	);

	function readBase64(input: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(input);
		});
	}

	async function submit() {
		if (!title.trim()) {
			toasts.show('Title is required', 'Give the document a name, e.g. “M&D accounting contract 2017”.', 'warn');
			return;
		}
		if (!file && !url.trim()) {
			toasts.show('Add a file or a link', 'Upload a PDF/DOCX or paste a Google Drive link.', 'warn');
			return;
		}
		busy = true;
		try {
			await data.addDocument({
				title: title.trim(),
				kind,
				url: url.trim(),
				note: note.trim(),
				file: file ? { name: file.name, mime: file.type || 'application/pdf', data: await readBase64(file) } : undefined
			});
			title = '';
			url = '';
			note = '';
			file = null;
			toasts.show('Document saved', 'It is now attached to this company.', 'ok');
		} catch (error) {
			toasts.error('Could not save the document', error);
		} finally {
			busy = false;
		}
	}

	async function download(doc: CompanyDocument) {
		try {
			const blob = await apiDownload(`/documents/${doc.id}/file`);
			const objectUrl = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = objectUrl;
			anchor.download = doc.fileName || doc.title;
			anchor.click();
			URL.revokeObjectURL(objectUrl);
		} catch (error) {
			toasts.error('Could not download the document', error);
		}
	}

	async function remove(doc: CompanyDocument) {
		if (!confirm(`Delete “${doc.title}”?`)) return;
		try {
			await data.deleteDocument(doc.id);
			toasts.show('Document deleted', doc.title, 'info');
		} catch (error) {
			toasts.error('Could not delete the document', error);
		}
	}
</script>

<svelte:head><title>Documents · openinvoice</title></svelte:head>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-5">
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-lg font-semibold">Documents</h1>
			<p class="text-xs text-muted">{data.company.name} · contracts, tax decisions and other company files</p>
		</div>
		<label class="flex h-8 min-w-0 flex-[0_1_260px] items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 text-[13px] focus-within:border-accent">
			<span class="font-mono text-accent" aria-hidden="true">/</span>
			<span class="sr-only">Search documents</span>
			<input bind:value={query} placeholder="title, file, note" class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint" autocomplete="off" />
		</label>
	</header>

	<section class="rounded-lg border border-line bg-panel p-4">
		<h2 class="label-caps mb-3">Add a document</h2>
		<div class="grid gap-3 md:grid-cols-2">
			<label class="block">
				<span class="mb-1 block text-xs text-muted">Title</span>
				<input bind:value={title} class="field" placeholder="M&D accounting contract 2017" />
			</label>
			<label class="block">
				<span class="mb-1 block text-xs text-muted">Kind</span>
				<select bind:value={kind} class="field">
					{#each kinds as option (option.value)}<option value={option.value}>{option.label}</option>{/each}
				</select>
			</label>
			<label class="block md:col-span-2">
				<span class="mb-1 block text-xs text-muted">External link (optional)</span>
				<input bind:value={url} class="field" placeholder="https://drive.google.com/..." />
			</label>
			<label class="block md:col-span-2">
				<span class="mb-1 block text-xs text-muted">File (PDF, DOCX or image, max 8 MB)</span>
				<input
					type="file"
					accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
					class="text-xs"
					onchange={(event) => (file = event.currentTarget.files?.[0] ?? null)}
				/>
				{#if file}<p class="mt-1 font-mono text-xs text-muted">{file.name} · {formatSize(file.size)}</p>{/if}
			</label>
			<label class="block md:col-span-2">
				<span class="mb-1 block text-xs text-muted">Note (optional)</span>
				<textarea bind:value={note} rows="3" class="field" placeholder="What this document is, who signed it, where the original is..."></textarea>
			</label>
		</div>
		<div class="mt-3 flex items-center gap-3">
			<button class="btn-primary" disabled={busy} onclick={submit}>{busy ? 'Saving…' : 'Add document'}</button>
			<p class="text-xs text-muted">Uploaded files are private. A Google Drive link is stored as a link.</p>
		</div>
	</section>

	<section class="overflow-hidden rounded-lg border border-line bg-panel">
		<div class="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
			<h2 class="text-sm font-medium">Company documents</h2>
			<p class="text-xs text-muted">{shown.length} {shown.length === 1 ? 'document' : 'documents'}</p>
		</div>
		{#if loading}
			<p class="px-4 py-10 text-center text-sm text-muted">Loading…</p>
		{:else if !shown.length}
			<div class="px-4 py-10 text-center">
				<p class="text-sm text-muted">No documents yet.</p>
				<p class="mt-1 text-xs text-muted">Add a contract, a tax decision or a link to Google Drive above.</p>
			</div>
		{:else}
			<ul class="divide-y divide-line-soft">
				{#each shown as doc (doc.id)}
					<li class="flex flex-wrap items-start gap-3 px-4 py-3">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<h3 class="text-[14px] font-medium">{doc.title}</h3>
								<span class="rounded bg-sunken px-1.5 py-0.5 text-[10px] text-muted">{kindLabel(doc.kind)}</span>
								{#if doc.hasFile}<span class="text-[10px] text-muted">{doc.fileName} · {formatSize(doc.size)}</span>{/if}
								<span class="text-[10px] text-faint">{formatDate(doc.createdAt)}</span>
							</div>
							{#if doc.note}<p class="mt-1 text-xs text-muted">{doc.note}</p>{/if}
							{#if doc.url}<p class="mt-1 truncate font-mono text-[11px] text-muted">{doc.url}</p>{/if}
						</div>
						<div class="flex shrink-0 items-center gap-1.5">
							{#if doc.url}
								<a class="btn" href={doc.url} target="_blank" rel="noreferrer">Open link</a>
							{/if}
							{#if doc.hasFile}
								<button class="btn" onclick={() => download(doc)}>Download</button>
							{/if}
							<button class="btn text-red-700" onclick={() => remove(doc)}>Delete</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
