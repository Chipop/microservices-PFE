import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '@/stores/app';
import { searchApi } from '@/services/api';
const route = useRoute();
const app = useAppStore();
const query = ref(String(route.query.q ?? ''));
const type = ref('All');
const loading = ref(false);
const remoteResults = ref([]);
const localResults = computed(() => {
    const q = query.value.toLowerCase();
    const all = [
        ...app.tasks.map(t => ({ type: 'Task', id: t.id, title: t.title, meta: `${t.key} · ${t.status}`, to: `/tasks/${t.id}` })),
        ...app.projects.map(p => ({ type: 'Project', id: p.id, title: p.name, meta: `${p.key} · ${p.description}`, to: `/projects/${p.id}/overview` })),
        ...app.workspaces.map(w => ({ type: 'Workspace', id: w.id, title: w.name, meta: w.description, to: '/workspaces' })),
    ];
    return all.filter(r => (type.value === 'All' || r.type === type.value) && (!q || (`${r.title} ${r.meta}`).toLowerCase().includes(q)));
});
const results = computed(() => remoteResults.value.length ? remoteResults.value : localResults.value);
watch(() => route.query.q, q => { query.value = String(q ?? ''); });
watch([query, type], search, { immediate: true });
async function search() {
    if (!query.value.trim() || import.meta.env.VITE_USE_MOCKS === 'true') {
        remoteResults.value = [];
        return;
    }
    loading.value = true;
    try {
        const response = await searchApi.global(query.value, type.value === 'All' ? undefined : type.value.toLowerCase());
        remoteResults.value = response.results.map(item => ({
            type: item.type,
            id: item.id,
            title: item.title,
            meta: item.snippet,
            to: item.type === 'task' ? `/tasks/${item.id}` : item.type === 'project' ? `/projects/${item.id}/overview` : '/search',
        }));
    }
    catch {
        remoteResults.value = [];
    }
    finally {
        loading.value = false;
    }
}
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "search-hero" },
});
/** @type {__VLS_StyleScopedClasses['search-hero']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    autofocus: true,
    placeholder: "Search FlowForge",
});
(__VLS_ctx.query);
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.type),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "search-layout" },
});
/** @type {__VLS_StyleScopedClasses['search-layout']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ class: "active" },
});
/** @type {__VLS_StyleScopedClasses['active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "panel" },
});
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "panel-header" },
});
/** @type {__VLS_StyleScopedClasses['panel-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
(__VLS_ctx.results.length);
if (__VLS_ctx.query) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.loading ? 'Searching...' : `Results for ${__VLS_ctx.query}`);
}
for (const [r] of __VLS_vFor((__VLS_ctx.results))) {
    let __VLS_0;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        key: (r.type + r.id),
        to: (r.to),
        ...{ class: "search-result" },
    }));
    const __VLS_2 = __VLS_1({
        key: (r.type + r.id),
        to: (r.to),
        ...{ class: "search-result" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    /** @type {__VLS_StyleScopedClasses['search-result']} */ ;
    const { default: __VLS_5 } = __VLS_3.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "result-type" },
    });
    /** @type {__VLS_StyleScopedClasses['result-type']} */ ;
    (r.type);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (r.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (r.meta);
    // @ts-ignore
    [query, query, query, type, results, results, loading,];
    var __VLS_3;
    // @ts-ignore
    [];
}
if (!__VLS_ctx.results.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-state" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
// @ts-ignore
[results,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
