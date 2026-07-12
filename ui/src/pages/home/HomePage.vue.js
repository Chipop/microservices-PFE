import { ArrowRight, Bell, CheckCircle2, Clock3, FolderPlus, ListTodo, Plus, Star } from 'lucide-vue-next';
import { computed } from 'vue';
import { useAppStore } from '@/stores/app';
import { useNotificationStore } from '@/stores/notifications';
import TaskRow from '@/components/task/TaskRow.vue';
const app = useAppStore();
const notifications = useNotificationStore();
const greetingName = computed(() => app.currentUser.name || app.currentUser.username);
const assigned = computed(() => app.tasks.filter(t => t.assignee?.id === app.currentUser.id && t.status !== 'Done').slice(0, 5));
const dueSoon = computed(() => app.tasks.filter(t => t.dueDate && t.status !== 'Done').slice(0, 4));
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "page home-page" },
});
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['home-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "page-header" },
});
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
(__VLS_ctx.app.currentWorkspace?.name);
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
(__VLS_ctx.greetingName);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "header-actions" },
});
/** @type {__VLS_StyleScopedClasses['header-actions']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ class: "btn" },
    to: "/projects/new",
}));
const __VLS_2 = __VLS_1({
    ...{ class: "btn" },
    to: "/projects/new",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
let __VLS_6;
/** @ts-ignore @type { | typeof __VLS_components.FolderPlus} */
FolderPlus;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
    size: (16),
}));
const __VLS_8 = __VLS_7({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
// @ts-ignore
[app, greetingName,];
var __VLS_3;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ class: "btn btn-primary" },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
let __VLS_11;
/** @ts-ignore @type { | typeof __VLS_components.Plus} */
Plus;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
    size: (16),
}));
const __VLS_13 = __VLS_12({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "quick-actions" },
});
/** @type {__VLS_StyleScopedClasses['quick-actions']} */ ;
let __VLS_16;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
    to: "/tasks?assigned=me",
}));
const __VLS_18 = __VLS_17({
    to: "/tasks?assigned=me",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
const { default: __VLS_21 } = __VLS_19.slots;
let __VLS_22;
/** @ts-ignore @type { | typeof __VLS_components.ListTodo} */
ListTodo;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent1(__VLS_22, new __VLS_22({
    size: (19),
}));
const __VLS_24 = __VLS_23({
    size: (19),
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
// @ts-ignore
[];
var __VLS_19;
let __VLS_27;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent1(__VLS_27, new __VLS_27({
    to: "/projects",
}));
const __VLS_29 = __VLS_28({
    to: "/projects",
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
const { default: __VLS_32 } = __VLS_30.slots;
let __VLS_33;
/** @ts-ignore @type { | typeof __VLS_components.FolderPlus} */
FolderPlus;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent1(__VLS_33, new __VLS_33({
    size: (19),
}));
const __VLS_35 = __VLS_34({
    size: (19),
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
// @ts-ignore
[];
var __VLS_30;
let __VLS_38;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent1(__VLS_38, new __VLS_38({
    to: "/search",
}));
const __VLS_40 = __VLS_39({
    to: "/search",
}, ...__VLS_functionalComponentArgsRest(__VLS_39));
const { default: __VLS_43 } = __VLS_41.slots;
let __VLS_44;
/** @ts-ignore @type { | typeof __VLS_components.Clock3} */
Clock3;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
    size: (19),
}));
const __VLS_46 = __VLS_45({
    size: (19),
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
// @ts-ignore
[];
var __VLS_41;
let __VLS_49;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent1(__VLS_49, new __VLS_49({
    to: "/notifications",
}));
const __VLS_51 = __VLS_50({
    to: "/notifications",
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
const { default: __VLS_54 } = __VLS_52.slots;
let __VLS_55;
/** @ts-ignore @type { | typeof __VLS_components.Bell} */
Bell;
// @ts-ignore
const __VLS_56 = __VLS_asFunctionalComponent1(__VLS_55, new __VLS_55({
    size: (19),
}));
const __VLS_57 = __VLS_56({
    size: (19),
}, ...__VLS_functionalComponentArgsRest(__VLS_56));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
(__VLS_ctx.notifications.unreadCount);
// @ts-ignore
[notifications,];
var __VLS_52;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "home-grid" },
});
/** @type {__VLS_StyleScopedClasses['home-grid']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "panel span-2" },
});
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['span-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "panel-header" },
});
/** @type {__VLS_StyleScopedClasses['panel-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
let __VLS_60;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent1(__VLS_60, new __VLS_60({
    to: "/tasks?assigned=me",
}));
const __VLS_62 = __VLS_61({
    to: "/tasks?assigned=me",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
const { default: __VLS_65 } = __VLS_63.slots;
let __VLS_66;
/** @ts-ignore @type { | typeof __VLS_components.ArrowRight} */
ArrowRight;
// @ts-ignore
const __VLS_67 = __VLS_asFunctionalComponent1(__VLS_66, new __VLS_66({
    size: (15),
}));
const __VLS_68 = __VLS_67({
    size: (15),
}, ...__VLS_functionalComponentArgsRest(__VLS_67));
// @ts-ignore
[];
var __VLS_63;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "task-list" },
});
/** @type {__VLS_StyleScopedClasses['task-list']} */ ;
for (const [task] of __VLS_vFor((__VLS_ctx.assigned))) {
    const __VLS_71 = TaskRow;
    // @ts-ignore
    const __VLS_72 = __VLS_asFunctionalComponent1(__VLS_71, new __VLS_71({
        key: (task.id),
        task: (task),
    }));
    const __VLS_73 = __VLS_72({
        key: (task.id),
        task: (task),
    }, ...__VLS_functionalComponentArgsRest(__VLS_72));
    // @ts-ignore
    [assigned,];
}
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
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "project-list" },
});
/** @type {__VLS_StyleScopedClasses['project-list']} */ ;
for (const [project] of __VLS_vFor((__VLS_ctx.app.currentProjects.slice(0, 4)))) {
    let __VLS_76;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent1(__VLS_76, new __VLS_76({
        key: (project.id),
        to: (`/projects/${project.id}/overview`),
        ...{ class: "project-card-compact" },
    }));
    const __VLS_78 = __VLS_77({
        key: (project.id),
        to: (`/projects/${project.id}/overview`),
        ...{ class: "project-card-compact" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    /** @type {__VLS_StyleScopedClasses['project-card-compact']} */ ;
    const { default: __VLS_81 } = __VLS_79.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "project-icon" },
        ...{ style: ({ background: project.color }) },
    });
    /** @type {__VLS_StyleScopedClasses['project-icon']} */ ;
    (project.key.slice(0, 1));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (project.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (project.completedCount);
    (project.taskCount);
    if (project.favorite) {
        let __VLS_82;
        /** @ts-ignore @type { | typeof __VLS_components.Star} */
        Star;
        // @ts-ignore
        const __VLS_83 = __VLS_asFunctionalComponent1(__VLS_82, new __VLS_82({
            size: (14),
            ...{ class: "favorite-star" },
        }));
        const __VLS_84 = __VLS_83({
            size: (14),
            ...{ class: "favorite-star" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_83));
        /** @type {__VLS_StyleScopedClasses['favorite-star']} */ ;
    }
    // @ts-ignore
    [app,];
    var __VLS_79;
    // @ts-ignore
    [];
}
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
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "due-list" },
});
/** @type {__VLS_StyleScopedClasses['due-list']} */ ;
for (const [task] of __VLS_vFor((__VLS_ctx.dueSoon))) {
    let __VLS_87;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_88 = __VLS_asFunctionalComponent1(__VLS_87, new __VLS_87({
        key: (task.id),
        to: (`/tasks/${task.id}`),
    }));
    const __VLS_89 = __VLS_88({
        key: (task.id),
        to: (`/tasks/${task.id}`),
    }, ...__VLS_functionalComponentArgsRest(__VLS_88));
    const { default: __VLS_92 } = __VLS_90.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "date-box" },
    });
    /** @type {__VLS_StyleScopedClasses['date-box']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
    (task.dueDate?.slice(8));
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (task.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (task.key);
    (task.priority);
    // @ts-ignore
    [dueSoon,];
    var __VLS_90;
    // @ts-ignore
    [];
}
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
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "activity-list" },
});
/** @type {__VLS_StyleScopedClasses['activity-list']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
let __VLS_93;
/** @ts-ignore @type { | typeof __VLS_components.CheckCircle2} */
CheckCircle2;
// @ts-ignore
const __VLS_94 = __VLS_asFunctionalComponent1(__VLS_93, new __VLS_93({
    size: (16),
}));
const __VLS_95 = __VLS_94({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_94));
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
let __VLS_98;
/** @ts-ignore @type { | typeof __VLS_components.ListTodo} */
ListTodo;
// @ts-ignore
const __VLS_99 = __VLS_asFunctionalComponent1(__VLS_98, new __VLS_98({
    size: (16),
}));
const __VLS_100 = __VLS_99({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_99));
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
let __VLS_103;
/** @ts-ignore @type { | typeof __VLS_components.Bell} */
Bell;
// @ts-ignore
const __VLS_104 = __VLS_asFunctionalComponent1(__VLS_103, new __VLS_103({
    size: (16),
}));
const __VLS_105 = __VLS_104({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_104));
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
