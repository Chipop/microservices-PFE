import Avatar from '@/components/common/Avatar.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
const __VLS_props = defineProps(); // @ts-ignore
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    to: (`/tasks/${__VLS_ctx.task.id}`),
    ...{ class: "task-row" },
}));
const __VLS_2 = __VLS_1({
    to: (`/tasks/${__VLS_ctx.task.id}`),
    ...{ class: "task-row" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5;
/** @type {__VLS_StyleScopedClasses['task-row']} */ ;
const { default: __VLS_6 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "task-key" },
});
/** @type {__VLS_StyleScopedClasses['task-key']} */ ;
(__VLS_ctx.task.key);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "task-title" },
});
/** @type {__VLS_StyleScopedClasses['task-title']} */ ;
(__VLS_ctx.task.title);
const __VLS_7 = StatusBadge;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
    value: (__VLS_ctx.task.status),
}));
const __VLS_9 = __VLS_8({
    value: (__VLS_ctx.task.status),
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "priority" },
    'data-priority': (__VLS_ctx.task.priority.toLowerCase()),
});
/** @type {__VLS_StyleScopedClasses['priority']} */ ;
(__VLS_ctx.task.priority);
if (__VLS_ctx.task.assignee) {
    const __VLS_12 = Avatar;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
        initials: (__VLS_ctx.task.assignee.initials),
        size: "sm",
    }));
    const __VLS_14 = __VLS_13({
        initials: (__VLS_ctx.task.assignee.initials),
        size: "sm",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
}
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "task-date" },
});
/** @type {__VLS_StyleScopedClasses['task-date']} */ ;
(__VLS_ctx.task.dueDate ?? 'No due date');
// @ts-ignore
[task, task, task, task, task, task, task, task, task,];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
