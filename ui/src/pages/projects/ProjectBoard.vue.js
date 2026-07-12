import { useAppStore } from '@/stores/app';
import Avatar from '@/components/common/Avatar.vue';
const props = defineProps();
const app = useAppStore();
const columns = ['Backlog', 'To do', 'In progress', 'Review', 'Done'];
const byStatus = (s) => app.tasks.filter(t => t.projectId === props.project.id && t.status === s);
function move(id, status) { app.updateTask(id, { status }); } // @ts-ignore
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "board" },
});
/** @type {__VLS_StyleScopedClasses['board']} */ ;
for (const [status] of __VLS_vFor((__VLS_ctx.columns))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        key: (status),
        ...{ class: "board-column" },
    });
    /** @type {__VLS_StyleScopedClasses['board-column']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (status);
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
    (__VLS_ctx.byStatus(status).length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "board-cards" },
    });
    /** @type {__VLS_StyleScopedClasses['board-cards']} */ ;
    for (const [task] of __VLS_vFor((__VLS_ctx.byStatus(status)))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
            key: (task.id),
            ...{ class: "board-card" },
        });
        /** @type {__VLS_StyleScopedClasses['board-card']} */ ;
        let __VLS_0;
        /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
            to: (`/tasks/${task.id}`),
        }));
        const __VLS_2 = __VLS_1({
            to: (`/tasks/${task.id}`),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        const { default: __VLS_5 } = __VLS_3.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        (task.key);
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
        (task.title);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "board-card-footer" },
        });
        /** @type {__VLS_StyleScopedClasses['board-card-footer']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "priority" },
            'data-priority': (task.priority.toLowerCase()),
        });
        /** @type {__VLS_StyleScopedClasses['priority']} */ ;
        (task.priority);
        if (task.assignee) {
            const __VLS_6 = Avatar;
            // @ts-ignore
            const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
                initials: (task.assignee.initials),
                size: "sm",
            }));
            const __VLS_8 = __VLS_7({
                initials: (task.assignee.initials),
                size: "sm",
            }, ...__VLS_functionalComponentArgsRest(__VLS_7));
        }
        // @ts-ignore
        [columns, byStatus, byStatus,];
        var __VLS_3;
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            ...{ onChange: (...[$event]) => {
                    return (__VLS_ctx.move(task.id, $event.target.value));
                    // @ts-ignore
                    [move,];
                } },
            value: (task.status),
        });
        for (const [s] of __VLS_vFor((__VLS_ctx.columns))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                key: (s),
            });
            (s);
            // @ts-ignore
            [columns,];
        }
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
