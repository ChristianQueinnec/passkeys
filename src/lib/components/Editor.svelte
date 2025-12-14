<script lang="ts">
    let { item, onSave, onCancel } = $props();

    // Initialize state from props (item is expected to be stable per mount)
    let title = $state(item?.title || "");
    let username = $state(item?.username || "");
    let password = $state(item?.password || "");
    let site = $state(item?.site || "");
    let tags = $state(item?.tags?.join(", ") || "");
    let notes = $state(item?.notes || "");

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
        <button onclick={onCancel}>Cancel</button>
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
    }
    button {
        padding: 0.5rem 1rem;
        margin-right: 0.5rem;
        cursor: pointer;
    }
</style>
