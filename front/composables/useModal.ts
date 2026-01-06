import { useOverlay } from '#imports'
import { markRaw, shallowRef } from 'vue'

const currentModal = shallowRef<any>(null)

export const useModal = () => {
    const overlay = useOverlay()

    function open(component: any, props?: any) {
        if (currentModal.value) {
            currentModal.value.close()
        }
        const instance = overlay.create(markRaw(component))
        currentModal.value = instance
        instance.open(props)
        return instance
    }

    function close() {
        if (currentModal.value) {
            currentModal.value.close()
            currentModal.value = null
        }
    }

    return {
        open,
        close
    }
}
