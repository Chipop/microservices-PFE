import { ref } from 'vue';
import { useRouter } from 'vue-router';
import logo from '@/assets/flowforge-logo.png';
import { useAuthStore } from '@/stores/auth';
const router = useRouter();
const auth = useAuthStore();
const username = ref('');
const email = ref('');
const password = ref('');
async function submit() {
    await auth.register(username.value, email.value, password.value);
    router.push('/preparing-workspace');
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "simple-auth" },
});
/** @type {__VLS_StyleScopedClasses['simple-auth']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "auth-panel" },
});
/** @type {__VLS_StyleScopedClasses['auth-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.img)({
    src: (__VLS_ctx.logo),
    alt: "FlowForge",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
    ...{ onSubmit: (__VLS_ctx.submit) },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    autocomplete: "username",
    required: true,
    placeholder: "your-name",
});
(__VLS_ctx.username);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "email",
    autocomplete: "email",
    required: true,
    placeholder: "you@example.com",
});
(__VLS_ctx.email);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "password",
    autocomplete: "new-password",
    required: true,
    placeholder: "At least 8 characters",
});
(__VLS_ctx.password);
if (__VLS_ctx.auth.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "form-error" },
    });
    /** @type {__VLS_StyleScopedClasses['form-error']} */ ;
    (__VLS_ctx.auth.error);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ class: "btn btn-primary btn-full" },
    disabled: (__VLS_ctx.auth.loading),
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-full']} */ ;
(__VLS_ctx.auth.loading ? 'Creating account...' : 'Create account');
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "centered" },
});
/** @type {__VLS_StyleScopedClasses['centered']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    to: "/login",
}));
const __VLS_2 = __VLS_1({
    to: "/login",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
// @ts-ignore
[logo, submit, username, email, password, auth, auth, auth, auth,];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
