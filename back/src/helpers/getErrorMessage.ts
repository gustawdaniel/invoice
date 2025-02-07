export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    console.error(error);
    return 'Unknown error';
}