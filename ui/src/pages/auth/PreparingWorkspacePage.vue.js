import { CheckCircle2, Loader2, RefreshCw } from 'lucide-vue-next';
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import logo from '@/assets/flowforge-logo.png';
import { useProvisioningStatus } from '@/composables/useProvisioningStatus';
import { useAuthStore } from '@/stores/auth';
const router = useRouter();
const auth = useAuthStore();
const provisioning = useProvisioningStatus();
const profileName = computed(() => auth.profile?.username ?? auth.currentUser.username);
const isFailed = computed(() => provisioning.state.value === 'failed');
const isReady = computed(() => provisioning.state.value === 'ready');
onMounted(() => {
    void run();
});
async function run() {
    const workspace = await provisioning.waitUntilReady();
    if (workspace) {
        await router.replace('/home');
    }
}
async function retry() {
    await provisioning.retry();
    if (isReady.value) {
        await router.replace('/home');
    }
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "provisioning-page" },
});
/** @type {__VLS_StyleScopedClasses['provisioning-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "provisioning-panel" },
});
/** @type {__VLS_StyleScopedClasses['provisioning-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.img)({
    src: (__VLS_ctx.logo),
    alt: "FlowForge",
    ...{ class: "provisioning-logo" },
});
/** @type {__VLS_StyleScopedClasses['provisioning-logo']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "provisioning-status" },
    ...{ class: ({ failed: __VLS_ctx.isFailed, ready: __VLS_ctx.isReady }) },
});
/** @type {__VLS_StyleScopedClasses['provisioning-status']} */ ;
/** @type {__VLS_StyleScopedClasses['failed']} */ ;
/** @type {__VLS_StyleScopedClasses['ready']} */ ;
if (__VLS_ctx.isFailed) {
    let __VLS_0;
    /** @ts-ignore @type { | typeof __VLS_components.RefreshCw} */
    RefreshCw;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        size: (28),
    }));
    const __VLS_2 = __VLS_1({
        size: (28),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else if (__VLS_ctx.isReady) {
    let __VLS_5;
    /** @ts-ignore @type { | typeof __VLS_components.CheckCircle2} */
    CheckCircle2;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        size: (28),
    }));
    const __VLS_7 = __VLS_6({
        size: (28),
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
}
else {
    let __VLS_10;
    /** @ts-ignore @type { | typeof __VLS_components.Loader2} */
    Loader2;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
        size: (28),
        ...{ class: "spin" },
    }));
    const __VLS_12 = __VLS_11({
        size: (28),
        ...{ class: "spin" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    /** @type {__VLS_StyleScopedClasses['spin']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "provisioning-copy" },
});
/** @type {__VLS_StyleScopedClasses['provisioning-copy']} */ ;
(__VLS_ctx.profileName);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "provisioning-progress" },
    'aria-hidden': "true",
});
/** @type {__VLS_StyleScopedClasses['provisioning-progress']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span)({});
if (!__VLS_ctx.isFailed) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "provisioning-detail" },
    });
    /** @type {__VLS_StyleScopedClasses['provisioning-detail']} */ ;
    (__VLS_ctx.provisioning.detail.value);
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "provisioning-error" },
    });
    /** @type {__VLS_StyleScopedClasses['provisioning-error']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.provisioning.error.value);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.retry) },
        ...{ class: "btn btn-primary" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
    let __VLS_15;
    /** @ts-ignore @type { | typeof __VLS_components.RefreshCw} */
    RefreshCw;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
        size: (16),
    }));
    const __VLS_17 = __VLS_16({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
}
// @ts-ignore
[logo, isFailed, isFailed, isFailed, isReady, isReady, profileName, provisioning, provisioning, retry,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
