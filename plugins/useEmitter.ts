import { defineNuxtPlugin } from '#app'
import mitt from 'mitt'
import {ModalConfig} from "~/interfaces/ModalConfig";

type Events = {
    'modal:open': ModalConfig;
    'modal:close': void
};

const emitter = mitt<Events>()

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.provide('bus', {
        $on: emitter.on,
        $emit: emitter.emit,
    })
})