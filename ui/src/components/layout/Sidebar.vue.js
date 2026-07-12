import { Bell, ChevronLeft, ChevronRight, CircleUserRound, FolderKanban, Home, ListTodo, Search, Settings, Star, Users, Workflow } from 'lucide-vue-next';
import { useAppStore } from '@/stores/app';
const app = useAppStore();
const main = [['Home', '/home', Home], ['Your Work', '/tasks?assigned=me', Workflow], ['Projects', '/projects', FolderKanban], ['Tasks', '/tasks', ListTodo], ['Search', '/search', Search], ['Members', '/members', Users], ['Notifications', '/notifications', Bell], ['Workspace Settings', '/workspace/settings', Settings]];
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
    ...{ class: "sidebar" },
    ...{ class: ({ collapsed: __VLS_ctx.app.sidebarCollapsed }) },
});
/** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['collapsed']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
    ...{ class: "sidebar-nav" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-nav']} */ ;
for (const [[label, to, icon]] of __VLS_vFor((__VLS_ctx.main))) {
    let __VLS_0;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        key: (String(label)),
        to: (String(to)),
        ...{ class: "nav-item" },
    }));
    const __VLS_2 = __VLS_1({
        key: (String(label)),
        to: (String(to)),
        ...{ class: "nav-item" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    /** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
    const { default: __VLS_5 } = __VLS_3.slots;
    const __VLS_6 = (icon);
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        size: (18),
    }));
    const __VLS_8 = __VLS_7({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (label);
    // @ts-ignore
    [app, main,];
    var __VLS_3;
    // @ts-ignore
    [];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-section" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-heading" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-heading']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
let __VLS_11;
/** @ts-ignore @type { | typeof __VLS_components.Star} */
Star;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
    size: (13),
}));
const __VLS_13 = __VLS_12({
    size: (13),
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
for (const [project] of __VLS_vFor((__VLS_ctx.app.currentProjects.filter(p => p.favorite)))) {
    let __VLS_16;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
        key: (project.id),
        to: (`/projects/${project.id}/overview`),
        ...{ class: "project-link" },
    }));
    const __VLS_18 = __VLS_17({
        key: (project.id),
        to: (`/projects/${project.id}/overview`),
        ...{ class: "project-link" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    /** @type {__VLS_StyleScopedClasses['project-link']} */ ;
    const { default: __VLS_21 } = __VLS_19.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "project-dot" },
        ...{ style: ({ background: project.color }) },
    });
    /** @type {__VLS_StyleScopedClasses['project-dot']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (project.name);
    // @ts-ignore
    [app,];
    var __VLS_19;
    // @ts-ignore
    [];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-section" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-heading" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-heading']} */ ;
for (const [project] of __VLS_vFor((__VLS_ctx.app.currentProjects.slice(0, 3)))) {
    let __VLS_22;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_23 = __VLS_asFunctionalComponent1(__VLS_22, new __VLS_22({
        key: (project.id),
        to: (`/projects/${project.id}/overview`),
        ...{ class: "project-link" },
    }));
    const __VLS_24 = __VLS_23({
        key: (project.id),
        to: (`/projects/${project.id}/overview`),
        ...{ class: "project-link" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_23));
    /** @type {__VLS_StyleScopedClasses['project-link']} */ ;
    const { default: __VLS_27 } = __VLS_25.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "project-key" },
    });
    /** @type {__VLS_StyleScopedClasses['project-key']} */ ;
    (project.key);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (project.name);
    // @ts-ignore
    [app,];
    var __VLS_25;
    // @ts-ignore
    [];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-footer" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-footer']} */ ;
let __VLS_28;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent1(__VLS_28, new __VLS_28({
    to: "/profile",
}));
const __VLS_30 = __VLS_29({
    to: "/profile",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
const { default: __VLS_33 } = __VLS_31.slots;
let __VLS_34;
/** @ts-ignore @type { | typeof __VLS_components.CircleUserRound} */
CircleUserRound;
// @ts-ignore
const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
    size: (18),
}));
const __VLS_36 = __VLS_35({
    size: (18),
}, ...__VLS_functionalComponentArgsRest(__VLS_35));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
// @ts-ignore
[];
var __VLS_31;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.app.toggleSidebar) },
    ...{ class: "collapse-button" },
});
/** @type {__VLS_StyleScopedClasses['collapse-button']} */ ;
if (__VLS_ctx.app.sidebarCollapsed) {
    let __VLS_39;
    /** @ts-ignore @type { | typeof __VLS_components.ChevronRight} */
    ChevronRight;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent1(__VLS_39, new __VLS_39({
        size: (17),
    }));
    const __VLS_41 = __VLS_40({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
}
else {
    let __VLS_44;
    /** @ts-ignore @type { | typeof __VLS_components.ChevronLeft} */
    ChevronLeft;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
        size: (17),
    }));
    const __VLS_46 = __VLS_45({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
}
// @ts-ignore
[app, app,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
