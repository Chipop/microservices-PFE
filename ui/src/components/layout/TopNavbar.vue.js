import { Bell, CircleHelp, Menu, Plus, Search } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/app';
import { useNotificationStore } from '@/stores/notifications';
import Avatar from '@/components/common/Avatar.vue';
import logo from '@/assets/flowforge-logo.png';
const emit = defineEmits();
const app = useAppStore();
const notifications = useNotificationStore();
const router = useRouter();
function runSearch() { if (app.globalQuery.trim())
    router.push({ path: '/search', query: { q: app.globalQuery } }); }
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "topbar" },
});
/** @type {__VLS_StyleScopedClasses['topbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "topbar-left" },
});
/** @type {__VLS_StyleScopedClasses['topbar-left']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.app.toggleSidebar) },
    ...{ class: "icon-btn mobile-menu" },
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-menu']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Menu} */
Menu;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: (19),
}));
const __VLS_2 = __VLS_1({
    size: (19),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    to: "/home",
    ...{ class: "brand" },
}));
const __VLS_7 = __VLS_6({
    to: "/home",
    ...{ class: "brand" },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
const { default: __VLS_10 } = __VLS_8.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.img)({
    src: (__VLS_ctx.logo),
    alt: "FlowForge",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
// @ts-ignore
[app, logo,];
var __VLS_8;
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    ...{ onChange: (...[$event]) => {
            return (__VLS_ctx.app.switchWorkspace($event.target.value));
            // @ts-ignore
            [app,];
        } },
    ...{ class: "workspace-select" },
    value: (__VLS_ctx.app.currentWorkspaceId),
});
/** @type {__VLS_StyleScopedClasses['workspace-select']} */ ;
for (const [w] of __VLS_vFor((__VLS_ctx.app.workspaces))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (w.id),
        value: (w.id),
    });
    (w.name);
    // @ts-ignore
    [app, app,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
    ...{ onSubmit: (__VLS_ctx.runSearch) },
    ...{ class: "global-search" },
});
/** @type {__VLS_StyleScopedClasses['global-search']} */ ;
let __VLS_11;
/** @ts-ignore @type { | typeof __VLS_components.Search} */
Search;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
    size: (16),
}));
const __VLS_13 = __VLS_12({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    placeholder: "Search work, people and files",
});
(__VLS_ctx.app.globalQuery);
__VLS_asFunctionalElement1(__VLS_intrinsics.kbd, __VLS_intrinsics.kbd)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "topbar-actions" },
});
/** @type {__VLS_StyleScopedClasses['topbar-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.emit('create'));
            // @ts-ignore
            [app, runSearch, emit,];
        } },
    ...{ class: "btn btn-primary" },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
let __VLS_16;
/** @ts-ignore @type { | typeof __VLS_components.Plus} */
Plus;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
    size: (16),
}));
const __VLS_18 = __VLS_17({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_21;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
    to: "/notifications",
    ...{ class: "icon-btn notification-button" },
}));
const __VLS_23 = __VLS_22({
    to: "/notifications",
    ...{ class: "icon-btn notification-button" },
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['notification-button']} */ ;
const { default: __VLS_26 } = __VLS_24.slots;
let __VLS_27;
/** @ts-ignore @type { | typeof __VLS_components.Bell} */
Bell;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent1(__VLS_27, new __VLS_27({
    size: (19),
}));
const __VLS_29 = __VLS_28({
    size: (19),
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
if (__VLS_ctx.notifications.unreadCount) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "count-badge" },
    });
    /** @type {__VLS_StyleScopedClasses['count-badge']} */ ;
    (__VLS_ctx.notifications.unreadCount);
}
// @ts-ignore
[notifications, notifications,];
var __VLS_24;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ class: "icon-btn" },
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
let __VLS_32;
/** @ts-ignore @type { | typeof __VLS_components.CircleHelp} */
CircleHelp;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent1(__VLS_32, new __VLS_32({
    size: (19),
}));
const __VLS_34 = __VLS_33({
    size: (19),
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
let __VLS_37;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
    to: "/profile",
    ...{ class: "user-trigger" },
}));
const __VLS_39 = __VLS_38({
    to: "/profile",
    ...{ class: "user-trigger" },
}, ...__VLS_functionalComponentArgsRest(__VLS_38));
/** @type {__VLS_StyleScopedClasses['user-trigger']} */ ;
const { default: __VLS_42 } = __VLS_40.slots;
const __VLS_43 = Avatar;
// @ts-ignore
const __VLS_44 = __VLS_asFunctionalComponent1(__VLS_43, new __VLS_43({
    initials: (__VLS_ctx.app.currentUser.initials),
    size: "sm",
}));
const __VLS_45 = __VLS_44({
    initials: (__VLS_ctx.app.currentUser.initials),
    size: "sm",
}, ...__VLS_functionalComponentArgsRest(__VLS_44));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.app.currentUser.name);
// @ts-ignore
[app, app,];
var __VLS_40;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.emit('logout'));
            // @ts-ignore
            [emit,];
        } },
    ...{ class: "btn" },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
});
export default {};
