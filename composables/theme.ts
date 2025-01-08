export const useTheme = () => {
    return computed<'dark' | 'light'>(() => {
        const mode = useColorMode();
        return mode.value as 'dark' | 'light';
    });
};

export function setTheme(value: 'dark' | 'light'): void {
    const colorMode = useColorMode();
    colorMode.preference = value;
}
