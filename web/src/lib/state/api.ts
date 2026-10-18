import { goto } from '$app/navigation';
import { session } from './session.svelte';

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'https://api.openinvoice.in';

export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
	}
}

interface Options {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	body?: unknown;
	text?: boolean;
	// requests that are not about the selected company (login)
	anonymous?: boolean;
}

// every company-scoped request carries the selected company and the mode (live / test)
function headers(options: Options): Record<string, string> {
	const result: Record<string, string> = {};
	if (options.body !== undefined) result['Content-Type'] = 'application/json';
	if (options.anonymous) return result;
	if (session.token) result.Authorization = `Bearer ${session.token}`;
	if (session.companyId) result['x-company-id'] = session.companyId;
	if (session.testMode) result['x-mode'] = 'test';
	return result;
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
	let response: Response;
	try {
		response = await fetch(`${API_URL}${path}`, {
			method: options.method ?? 'GET',
			headers: headers(options),
			body: options.body === undefined ? undefined : JSON.stringify(options.body)
		});
	} catch {
		throw new ApiError(navigator.onLine ? `Cannot reach ${API_URL}` : 'You are offline', 0);
	}

	if (response.status === 401 && !options.anonymous) {
		session.logout();
		await goto('/login');
		throw new ApiError('Session expired, log in again', 401);
	}

	const raw = await response.text();
	if (!response.ok) {
		let message = raw || response.statusText;
		try {
			message = JSON.parse(raw).message ?? message;
		} catch {
			// plain text error
		}
		throw new ApiError(message, response.status);
	}
	if (options.text) return raw as T;
	return (raw ? JSON.parse(raw) : null) as T;
}

// authenticated binary download (company documents); returns a Blob for a temporary object URL
export async function apiDownload(path: string): Promise<Blob> {
	const response = await fetch(`${API_URL}${path}`, { headers: headers({}) });
	if (response.status === 401) {
		session.logout();
		await goto('/login');
		throw new ApiError('Session expired, log in again', 401);
	}
	if (!response.ok) {
		throw new ApiError((await response.text()) || response.statusText, response.status);
	}
	return response.blob();
}
