<script lang="ts">
    let { item, onSave, onCancel } = $props();

    // Local state for the editor
    let title = $state("");
    let username = $state("");
    let password = $state("");
    let site = $state("");
    let tags = $state("");
    let notes = $state("");

    // Initialize/Sync state from props
    $effect(() => {
        title = item?.title || "";
        username = item?.username || "";
        password = item?.password || "";
        site = item?.site || "";
        tags = item?.tags?.join(", ") || "";
        notes = item?.notes || "";
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
        });
    }
</script>

<div class="editor">
    <div class="field">
        <label for="title">Title *</label>
        <input id="title" type="text" required bind:value={title} />
    </div>
    <div class="field">
        <label for="site">Site URL</label>
        <input id="site" type="text" bind:value={site} />
    </div>
    <div class="field">
        <label for="username">Username</label>
        <input id="username" type="text" bind:value={username} />
    </div>
    <div class="field">
        <label for="password">Password</label>
        <input id="password" type="text" bind:value={password} />
    </div>
    <div class="field">
        <label for="tags">Tags (comma separated)</label>
        <input id="tags" type="text" bind:value={tags} />
    </div>
    <div class="field">
        <label for="notes">Notes</label>
        <textarea id="notes" bind:value={notes}></textarea>
    </div>

    <div class="actions">
        <button onclick={handleSubmit} disabled={!title}>Save</button>
        <button class="secondary" onclick={onCancel}>Cancel</button>
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
