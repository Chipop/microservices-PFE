import { Plus, Search, Star } from 'lucide-vue-next';
import { ref, computed } from 'vue';
import { useAppStore } from '@/stores/app';
const app = useAppStore();
const query = ref('');
const filtered = computed(() => app.currentProjects.filter(p => p.name.toLowerCase().includes(query.value.toLowerCase())));
const progress = (p) => p.taskCount ? Math.round(p.completedCount / p.taskCount * 100) : 0; // @ts-ignore
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "page" },
});
/** @type {__VLS_StyleScopedClasses['page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "page-header" },
});
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
(__VLS_ctx.app.currentWorkspace?.name);
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    to: "/projects/new",
    ...{ class: "btn btn-primary" },
}));
const __VLS_2 = __VLS_1({
    to: "/projects/new",
    ...{ class: "btn btn-primary" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
let __VLS_6;
/** @ts-ignore @type { | typeof __VLS_components.Plus} */
Plus;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
    size: (16),
}));
const __VLS_8 = __VLS_7({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
// @ts-ignore
[app,];
var __VLS_3;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "toolbar" },
});
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "search-input" },
});
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
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
    placeholder: "Search projects",
});
(__VLS_ctx.query);
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "projects-table" },
});
/** @type {__VLS_StyleScopedClasses['projects-table']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "table-header" },
});
/** @type {__VLS_StyleScopedClasses['table-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
for (const [p] of __VLS_vFor((__VLS_ctx.filtered))) {
    let __VLS_16;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
        key: (p.id),
        to: (`/projects/${p.id}/overview`),
        ...{ class: "project-table-row" },
    }));
    const __VLS_18 = __VLS_17({
        key: (p.id),
        to: (`/projects/${p.id}/overview`),
        ...{ class: "project-table-row" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    /** @type {__VLS_StyleScopedClasses['project-table-row']} */ ;
    const { default: __VLS_21 } = __VLS_19.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "project-name-cell" },
    });
    /** @type {__VLS_StyleScopedClasses['project-name-cell']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "project-icon" },
        ...{ style: ({ background: p.color }) },
    });
    /** @type {__VLS_StyleScopedClasses['project-icon']} */ ;
    (p.key[0]);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (p.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (p.key);
    (p.description);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (p.lead.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "progress" },
    });
    /** @type {__VLS_StyleScopedClasses['progress']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
        ...{ style: ({ width: `${__VLS_ctx.progress(p)}%` }) },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (p.completedCount);
    (p.taskCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (p.updatedAt);
    let __VLS_22;
    /** @ts-ignore @type { | typeof __VLS_components.Star} */
    Star;
    // @ts-ignore
    const __VLS_23 = __VLS_asFunctionalComponent1(__VLS_22, new __VLS_22({
        size: (16),
        ...{ class: ({ filled: p.favorite }) },
    }));
    const __VLS_24 = __VLS_23({
        size: (16),
        ...{ class: ({ filled: p.favorite }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_23));
    /** @type {__VLS_StyleScopedClasses['filled']} */ ;
    // @ts-ignore
    [query, filtered, progress,];
    var __VLS_19;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
