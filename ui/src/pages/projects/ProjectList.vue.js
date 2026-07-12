import { computed, ref } from 'vue';
import { useAppStore } from '@/stores/app';
import TaskRow from '@/components/task/TaskRow.vue';
const props = defineProps();
const app = useAppStore();
const filter = ref('');
const rows = computed(() => app.tasks.filter(t => t.projectId === props.project.id && t.title.toLowerCase().includes(filter.value.toLowerCase()))); // @ts-ignore
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "panel" },
});
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "toolbar" },
});
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    placeholder: "Filter tasks",
});
(__VLS_ctx.filter);
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "task-list" },
});
/** @type {__VLS_StyleScopedClasses['task-list']} */ ;
for (const [t] of __VLS_vFor((__VLS_ctx.rows))) {
    const __VLS_0 = TaskRow;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        key: (t.id),
        task: (t),
    }));
    const __VLS_2 = __VLS_1({
        key: (t.id),
        task: (t),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    // @ts-ignore
    [filter, rows,];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
