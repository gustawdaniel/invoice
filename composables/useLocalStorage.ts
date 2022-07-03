import {onBeforeMount, Ref, watch} from "vue";

export function useLocalStorage(key: string, ref: Ref) {
    onBeforeMount(() => {
        console.log("beforeMount");
        const value = window.localStorage.getItem(key);
        if(value) {
            ref.value = JSON.parse(value);
        }
    })

    watch(ref, () => {
        console.log("watch");
        window.localStorage.setItem(key, JSON.stringify(ref.value));
    }, {deep: true})

    const clearEntry = (refValue) => {
      ref.value = refValue;
      window.localStorage.setItem(key, refValue);
    }

    return {
        clearEntry, onBeforeMount
    }
}