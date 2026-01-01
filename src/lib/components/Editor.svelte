<script lang="ts">
    import { i18n } from "$lib/stores/useI18n.svelte";

    let { item, onSave, onCancel } = $props();

    // Local state for the editor
    let title = $state("");
    let username = $state("");
    let password = $state("");
    let site = $state("");
    let tags = $state("");
    let notes = $state("");
    let group = $state("");

    // Initialize/Sync state from props
    $effect(() => {
        title = item?.title || "";
        username = item?.username || "";
        password = item?.password || "";
        site = item?.site || "";
        tags = item?.tags?.join(", ") || "";
        notes = item?.notes || "";
        group = item?.group || "";
    });

    function handleSubmit() {
        onSave({
            ...item,
            title,
            username,
            password,
            site,
            tags: tags
                .split(",")
                .map((t: string) => t.trim())
                .filter((t: string) => t),
            notes,
            group: group.trim() || undefined,
        });
    }
</script>

<div class="editor">
    <div class="field">
        <label for="title">{i18n.t("common.title")} *</label>
        <input
            id="title"
            type="text"
            required
            bind:value={title}
            data-testid="edit-title"
        />
    </div>
    <div class="field">
        <label for="site">{i18n.t("common.site")}</label>
        <input
            id="site"
            type="text"
            bind:value={site}
            data-testid="edit-site"
        />
    </div>
    <div class="field">
        <label for="username">{i18n.t("common.username")}</label>
        <input
            id="username"
            type="text"
            bind:value={username}
            data-testid="edit-username"
        />
    </div>
    <div class="field">
        <label for="password">{i18n.t("common.password")}</label>
        <input
            id="password"
            type="text"
            bind:value={password}
            data-testid="edit-password"
        />
    </div>
    <div class="field">
        <label for="group">{i18n.t("common.group")}</label>
        <input
            id="group"
            type="text"
            bind:value={group}
            placeholder={i18n.t("common.group_placeholder")}
            data-testid="edit-group"
        />
    </div>
    <div class="field">
        <label for="tags">{i18n.t("common.tags")}</label>
        <input
            id="tags"
            type="text"
            bind:value={tags}
            placeholder={i18n.t("common.tags_placeholder")}
            data-testid="edit-tags"
        />
    </div>
    <div class="field">
        <label for="notes">{i18n.t("common.notes")}</label>
        <textarea id="notes" bind:value={notes} data-testid="edit-notes"
        ></textarea>
    </div>

    <div class="actions">
        <button onclick={handleSubmit} disabled={!title} data-testid="edit-save"
            >{i18n.t("common.save")}</button
        >
        <button class="secondary" onclick={onCancel} data-testid="edit-cancel"
            >{i18n.t("common.cancel")}</button
        >
    </div>
</div>

<style>
    .editor {
        padding: 1rem;
    }
    .field {
        margin-bottom: 1rem;
    }
    label {
        display: block;
        margin-bottom: 0.25rem;
        font-weight: bold;
    }
    input,
    textarea {
        width: 100%;
        padding: 0.5rem;
    }
    textarea {
        height: 100px;
    }
    .actions {
        margin-top: 1rem;
        display: flex;
        gap: 0.5rem;
    }
</style>
