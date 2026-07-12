import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import TopNavbar from './TopNavbar.vue';
import Sidebar from './Sidebar.vue';
import Modal from '@/components/common/Modal.vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notifications';
const app = useAppStore();
const auth = useAuthStore();
const notifications = useNotificationStore();
const router = useRouter();
const createOpen = ref(false);
const form = ref({ title: '', projectId: '', status: 'To do', priority: 'Medium', dueDate: '' });
const createError = ref('');
onMounted(async () => { await app.initialize(); form.value.projectId = app.currentProjects[0]?.id ?? ''; await notifications.initialize(); notifications.connectSocket(); });
async function createTask() { createError.value = ''; if (!form.value.title.trim())
    return; if (!form.value.projectId) {
    createError.value = 'Create a project before adding tasks.';
    return;
} await app.createTask(form.value); createOpen.value = false; form.value.title = ''; }
async function logout() { notifications.reset(); app.reset(); await auth.logoutRemote(); router.push('/login'); }
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-shell" },
});
/** @type {__VLS_StyleScopedClasses['app-shell']} */ ;
const __VLS_0 = TopNavbar;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onCreate': {} },
    ...{ 'onLogout': {} },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onCreate': {} },
    ...{ 'onLogout': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = {
    /** @type {typeof __VLS_5.create} */
    onCreate: (...[$event]) => {
        return (__VLS_ctx.createOpen = true);
        // @ts-ignore
        [createOpen,];
    },
};
const __VLS_7 = {
    /** @type {typeof __VLS_5.logout} */
    onLogout: (__VLS_ctx.logout),
};
var __VLS_3;
var __VLS_4;
const __VLS_8 = Sidebar;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({}));
const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "app-main" },
    ...{ class: ({ expanded: __VLS_ctx.app.sidebarCollapsed }) },
});
/** @type {__VLS_StyleScopedClasses['app-main']} */ ;
/** @type {__VLS_StyleScopedClasses['expanded']} */ ;
let __VLS_13;
/** @ts-ignore @type { | typeof __VLS_components.RouterView} */
RouterView;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({}));
const __VLS_15 = __VLS_14({}, ...__VLS_functionalComponentArgsRest(__VLS_14));
const __VLS_18 = Modal || Modal;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
    ...{ 'onClose': {} },
    title: "Create task",
    open: (__VLS_ctx.createOpen),
}));
const __VLS_20 = __VLS_19({
    ...{ 'onClose': {} },
    title: "Create task",
    open: (__VLS_ctx.createOpen),
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
let __VLS_23;
const __VLS_24 = {
    /** @type {typeof __VLS_23.close} */
    onClose: (...[$event]) => {
        return (__VLS_ctx.createOpen = false);
        // @ts-ignore
        [createOpen, createOpen, logout, app,];
    },
};
const { default: __VLS_25 } = __VLS_21.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
    ...{ onSubmit: (__VLS_ctx.createTask) },
    ...{ class: "form-stack" },
});
/** @type {__VLS_StyleScopedClasses['form-stack']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    autofocus: true,
    placeholder: "What needs to be done?",
});
(__VLS_ctx.form.title);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.form.projectId),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "",
    disabled: true,
});
for (const [p] of __VLS_vFor((__VLS_ctx.app.currentProjects))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (p.id),
        value: (p.id),
    });
    (p.name);
    // @ts-ignore
    [app, createTask, form, form,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-grid" },
});
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.form.status),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.form.priority),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "date",
});
(__VLS_ctx.form.dueDate);
if (__VLS_ctx.createError) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "form-error" },
    });
    /** @type {__VLS_StyleScopedClasses['form-error']} */ ;
    (__VLS_ctx.createError);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "modal-actions" },
});
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.createOpen = false);
            // @ts-ignore
            [createOpen, form, form, form, createError, createError,];
        } },
    type: "button",
    ...{ class: "btn" },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ class: "btn btn-primary" },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
// @ts-ignore
[];
var __VLS_21;
var __VLS_22;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
