import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Archive, Bell, Calendar, Link2, Paperclip, Repeat2, Trash2 } from 'lucide-vue-next';
import { useAppStore } from '@/stores/app';
import Avatar from '@/components/common/Avatar.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
const route = useRoute();
const router = useRouter();
const app = useAppStore();
const comment = ref('');
const loading = ref(false);
const task = computed(() => app.tasks.find(t => t.id === route.params.id || t.key === route.params.id));
const projectName = computed(() => task.value ? app.projects.find(p => p.id === task.value?.projectId)?.name : '');
async function hydrate() {
    loading.value = true;
    try {
        await app.hydrateTaskDetails(String(route.params.id));
    }
    finally {
        loading.value = false;
    }
}
function updateStatus(e) {
    if (task.value)
        app.updateTask(task.value.id, { status: e.target.value });
}
function updatePriority(e) {
    if (task.value)
        app.updateTask(task.value.id, { priority: e.target.value });
}
async function addComment() {
    if (!task.value || !comment.value.trim())
        return;
    await app.addComment(task.value.id, comment.value.trim());
    comment.value = '';
}
onMounted(hydrate);
watch(() => route.params.id, hydrate);
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
if (__VLS_ctx.task) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "task-detail-page" },
    });
    /** @type {__VLS_StyleScopedClasses['task-detail-page']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
        ...{ class: "task-detail-header" },
    });
    /** @type {__VLS_StyleScopedClasses['task-detail-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.task))
                    throw 0;
                return (__VLS_ctx.router.back());
                // @ts-ignore
                [task, router,];
            } },
        ...{ class: "link-button" },
    });
    /** @type {__VLS_StyleScopedClasses['link-button']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    (__VLS_ctx.task.key);
    (__VLS_ctx.projectName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
    (__VLS_ctx.task.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "header-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['header-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ class: "btn" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    let __VLS_0;
    /** @ts-ignore @type { | typeof __VLS_components.Archive} */
    Archive;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        size: (15),
    }));
    const __VLS_2 = __VLS_1({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ class: "btn btn-danger" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
    let __VLS_5;
    /** @ts-ignore @type { | typeof __VLS_components.Trash2} */
    Trash2;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        size: (15),
    }));
    const __VLS_7 = __VLS_6({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "task-detail-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['task-detail-grid']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
        ...{ class: "task-main panel" },
    });
    /** @type {__VLS_StyleScopedClasses['task-main']} */ ;
    /** @type {__VLS_StyleScopedClasses['panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "editable-block" },
    });
    /** @type {__VLS_StyleScopedClasses['editable-block']} */ ;
    (__VLS_ctx.task.description || 'No description yet.');
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    for (const [s] of __VLS_vFor((__VLS_ctx.task.subtasks))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            key: (s.id),
            ...{ class: "subtask" },
        });
        /** @type {__VLS_StyleScopedClasses['subtask']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "checkbox",
        });
        (s.done);
        (s.title);
        // @ts-ignore
        [task, task, task, task, projectName,];
    }
    if (!__VLS_ctx.task.subtasks.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    if (__VLS_ctx.task.attachments.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "file-list" },
        });
        /** @type {__VLS_StyleScopedClasses['file-list']} */ ;
        for (const [a] of __VLS_vFor((__VLS_ctx.task.attachments))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (a.id),
            });
            let __VLS_10;
            /** @ts-ignore @type { | typeof __VLS_components.Paperclip} */
            Paperclip;
            // @ts-ignore
            const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
                size: (18),
            }));
            const __VLS_12 = __VLS_11({
                size: (18),
            }, ...__VLS_functionalComponentArgsRest(__VLS_11));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (a.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
            (a.size);
            // @ts-ignore
            [task, task, task,];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
        ...{ onSubmit: (__VLS_ctx.addComment) },
        ...{ class: "comment-composer" },
    });
    /** @type {__VLS_StyleScopedClasses['comment-composer']} */ ;
    const __VLS_15 = Avatar;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
        initials: (__VLS_ctx.app.currentUser.initials),
        size: "sm",
    }));
    const __VLS_17 = __VLS_16({
        initials: (__VLS_ctx.app.currentUser.initials),
        size: "sm",
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
        value: (__VLS_ctx.comment),
        placeholder: "Add a comment...",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ class: "btn btn-primary" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
    if (__VLS_ctx.loading) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    }
    for (const [c] of __VLS_vFor((__VLS_ctx.task.comments))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
            key: (c.id),
            ...{ class: "comment" },
        });
        /** @type {__VLS_StyleScopedClasses['comment']} */ ;
        const __VLS_20 = Avatar;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent1(__VLS_20, new __VLS_20({
            initials: (c.author.initials),
            size: "sm",
        }));
        const __VLS_22 = __VLS_21({
            initials: (c.author.initials),
            size: "sm",
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (c.author.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        (c.createdAt);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (c.body);
        // @ts-ignore
        [task, addComment, app, comment, loading,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "activity-list" },
    });
    /** @type {__VLS_StyleScopedClasses['activity-list']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    const __VLS_25 = StatusBadge;
    // @ts-ignore
    const __VLS_26 = __VLS_asFunctionalComponent1(__VLS_25, new __VLS_25({
        value: "Updated",
    }));
    const __VLS_27 = __VLS_26({
        value: "Updated",
    }, ...__VLS_functionalComponentArgsRest(__VLS_26));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.task.status);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (__VLS_ctx.task.updatedAt);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    const __VLS_30 = StatusBadge;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
        value: "Created",
    }));
    const __VLS_32 = __VLS_31({
        value: "Created",
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.task.reporter.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (__VLS_ctx.task.createdAt);
    __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
        ...{ class: "task-sidebar panel" },
    });
    /** @type {__VLS_StyleScopedClasses['task-sidebar']} */ ;
    /** @type {__VLS_StyleScopedClasses['panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        ...{ onChange: (__VLS_ctx.updateStatus) },
        value: (__VLS_ctx.task.status),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        ...{ onChange: (__VLS_ctx.updatePriority) },
        value: (__VLS_ctx.task.priority),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "person-field" },
    });
    /** @type {__VLS_StyleScopedClasses['person-field']} */ ;
    const __VLS_35 = Avatar;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent1(__VLS_35, new __VLS_35({
        initials: (__VLS_ctx.task.assignee?.initials ?? '?'),
        size: "sm",
    }));
    const __VLS_37 = __VLS_36({
        initials: (__VLS_ctx.task.assignee?.initials ?? '?'),
        size: "sm",
    }, ...__VLS_functionalComponentArgsRest(__VLS_36));
    (__VLS_ctx.task.assignee?.name ?? 'Unassigned');
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "person-field" },
    });
    /** @type {__VLS_StyleScopedClasses['person-field']} */ ;
    const __VLS_40 = Avatar;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent1(__VLS_40, new __VLS_40({
        initials: (__VLS_ctx.task.reporter.initials),
        size: "sm",
    }));
    const __VLS_42 = __VLS_41({
        initials: (__VLS_ctx.task.reporter.initials),
        size: "sm",
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    (__VLS_ctx.task.reporter.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    let __VLS_45;
    /** @ts-ignore @type { | typeof __VLS_components.Calendar} */
    Calendar;
    // @ts-ignore
    const __VLS_46 = __VLS_asFunctionalComponent1(__VLS_45, new __VLS_45({
        size: (15),
    }));
    const __VLS_47 = __VLS_46({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_46));
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "date",
        value: (__VLS_ctx.task.dueDate),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tag-list" },
    });
    /** @type {__VLS_StyleScopedClasses['tag-list']} */ ;
    for (const [tag] of __VLS_vFor((__VLS_ctx.task.tags))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (tag),
        });
        (tag);
        // @ts-ignore
        [task, task, task, task, task, task, task, task, task, task, task, task, updateStatus, updatePriority,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.hr)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ class: "detail-action" },
    });
    /** @type {__VLS_StyleScopedClasses['detail-action']} */ ;
    let __VLS_50;
    /** @ts-ignore @type { | typeof __VLS_components.Link2} */
    Link2;
    // @ts-ignore
    const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
        size: (16),
    }));
    const __VLS_52 = __VLS_51({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_51));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.task.dependencies.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ class: "detail-action" },
    });
    /** @type {__VLS_StyleScopedClasses['detail-action']} */ ;
    let __VLS_55;
    /** @ts-ignore @type { | typeof __VLS_components.Repeat2} */
    Repeat2;
    // @ts-ignore
    const __VLS_56 = __VLS_asFunctionalComponent1(__VLS_55, new __VLS_55({
        size: (16),
    }));
    const __VLS_57 = __VLS_56({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_56));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.task.recurrence ?? 'None');
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ class: "detail-action" },
    });
    /** @type {__VLS_StyleScopedClasses['detail-action']} */ ;
    let __VLS_60;
    /** @ts-ignore @type { | typeof __VLS_components.Bell} */
    Bell;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent1(__VLS_60, new __VLS_60({
        size: (16),
    }));
    const __VLS_62 = __VLS_61({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.task.reminders.length);
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
    let __VLS_65;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_66 = __VLS_asFunctionalComponent1(__VLS_65, new __VLS_65({
        to: "/tasks",
        ...{ class: "btn" },
    }));
    const __VLS_67 = __VLS_66({
        to: "/tasks",
        ...{ class: "btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_66));
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    const { default: __VLS_70 } = __VLS_68.slots;
    // @ts-ignore
    [task, task, task,];
    var __VLS_68;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
