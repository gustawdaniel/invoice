import { load, save } from './storage';

export type Theme = 'light' | 'dark' | 'hacker';
export const THEMES: Theme[] = ['light', 'dark', 'hacker'];

// app.html applies the stored theme before the first paint; light needs no attribute
class ThemeState {
	value = $state<Theme>(THEMES.includes(load('oi.theme', 'light')) ? load('oi.theme', 'light') : 'light');

	set(theme: Theme) {
		this.value = theme;
		save('oi.theme', theme);
		if (theme === 'light') delete document.documentElement.dataset.theme;
		else document.documentElement.dataset.theme = theme;
	}

	cycle() {
		this.set(THEMES[(THEMES.indexOf(this.value) + 1) % THEMES.length]);
	}
}

export const theme = new ThemeState();
