export interface ModalConfig {
    template: any,
    data: any,
    params: {
        onConfirm?: (value: any) => void
    }
}