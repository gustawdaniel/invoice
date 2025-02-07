import type {GoogleLoginCallbackPayload} from "~/interfaces/GoogleLoginCallbackPayload";

export {};

declare global {
    interface Window {
        googleLoginCallback: (response: GoogleLoginCallbackPayload) => Promise<void>;
    }
}