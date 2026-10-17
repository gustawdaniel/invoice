import type { User } from '../types';
import { load, save } from './storage';

// who is logged in and what they work on; survives reloads
class Session {
	token = $state<string | null>(load('oi.token', null));
	user = $state<User | null>(load('oi.user', null));
	// null = the default company of the user
	companyId = $state<string | null>(load('oi.company', null));
	// like Stripe: test mode shows only test invoices and sends them to KSeF DEMO
	testMode = $state<boolean>(load('oi.test', false));

	get loggedIn() {
		return Boolean(this.token && this.user && !expired(this.token));
	}

	get isAdmin() {
		return this.user?.roles.includes('admin') ?? false;
	}

	login(token: string, user: User) {
		this.token = token;
		this.user = user;
		this.companyId = null;
		this.persist();
	}

	logout() {
		this.token = null;
		this.user = null;
		this.persist();
	}

	persist() {
		save('oi.token', this.token);
		save('oi.user', this.user);
		save('oi.company', this.companyId);
		save('oi.test', this.testMode);
	}
}

// reads `exp` from the JWT payload, the backend checks the signature
function expired(token: string): boolean {
	try {
		const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
		return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
	} catch {
		return true;
	}
}

export const session = new Session();
