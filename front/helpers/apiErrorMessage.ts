// $fetch errors carry the backend reason (e.g. KSeF rejection) in data.message
export function apiErrorMessage(error: unknown): string {
    const data = (error as { data?: { message?: string } })?.data;
    if (data?.message) return data.message;
    if (error instanceof Error) return error.message;
    return 'Unknown error';
}
