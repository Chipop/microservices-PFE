import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '@/stores/app';
import ProjectTabs from '@/components/project/ProjectTabs.vue';
const route = useRoute();
const app = useAppStore();
const project = computed(() => app.projects.find(p => p.id === route.params.id)); // @ts-ignore
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
if (__VLS_ctx.project) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "page project-page" },
    });
    /** @type {__VLS_StyleScopedClasses['page']} */ ;
    /** @type {__VLS_StyleScopedClasses['project-page']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
        ...{ class: "project-header" },
    });
    /** @type {__VLS_StyleScopedClasses['project-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "project-icon large" },
        ...{ style: ({ background: __VLS_ctx.project.color }) },
    });
    /** @type {__VLS_StyleScopedClasses['project-icon']} */ ;
    /** @type {__VLS_StyleScopedClasses['large']} */ ;
    (__VLS_ctx.project.key[0]);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    (__VLS_ctx.project.key);
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
    (__VLS_ctx.project.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.project.description);
    const __VLS_0 = ProjectTabs;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        projectId: (__VLS_ctx.project.id),
    }));
    const __VLS_2 = __VLS_1({
        projectId: (__VLS_ctx.project.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_5;
    /** @ts-ignore @type { | typeof __VLS_components.RouterView} */
    RouterView;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        project: (__VLS_ctx.project),
    }));
    const __VLS_7 = __VLS_6({
        project: (__VLS_ctx.project),
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "page" },
    });
    /** @type {__VLS_StyleScopedClasses['page']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-state" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    let __VLS_10;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
        ...{ class: "btn" },
        to: "/projects",
    }));
    const __VLS_12 = __VLS_11({
        ...{ class: "btn" },
        to: "/projects",
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    const { default: __VLS_15 } = __VLS_13.slots;
    // @ts-ignore
    [project, project, project, project, project, project, project, project,];
    var __VLS_13;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
