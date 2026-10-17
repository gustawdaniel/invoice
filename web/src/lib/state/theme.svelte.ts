import { load, save } from './storage';

export type Theme = 'system' | 'light' | 'dark';
const ORDER: Theme[] = ['system', 'light', 'dark'];

// light, dark, or whatever the system says; app.html applies it before the first paint
class ThemeState {
	value = $state<Theme>(load('oi.theme', 'system'));

	set(theme: Theme) {
		this.value = theme;
		save('oi.theme', theme);
		if (theme === 'system') delete document.documentElement.dataset.theme;
		else document.documentElement.dataset.theme = theme;
	}

	cycle() {
		this.set(ORDER[(ORDER.indexOf(this.value) + 1) % ORDER.length]);
	}
}

export const theme = new ThemeState();
