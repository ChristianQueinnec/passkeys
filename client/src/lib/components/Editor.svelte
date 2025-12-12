<script lang="ts">
    let { item, onSave, onCancel } = $props();

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
            console,
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
    <h2>{item?.filename ? "Edit Item" : "New Item"}</h2>

    <div class="field">
        <label>Title *</label>
        <input type="text" bind:value={title} />
    </div>
    <div class="field">
        <label>Site URL</label>
        <input type="text" bind:value={site} />
    </div>
    <div class="field">
        <label>Username</label>
        <input type="text" bind:value={username} />
    </div>
    <div class="field">
        <label>Password</label>
        <input type="text" bind:value={password} />
    </div>
    <div class="field">
        <label>Tags (comma separated)</label>
        <input type="text" bind:value={tags} />
    </div>
    <div class="field">
        <label>Notes</label>
        <textarea bind:value={notes}></textarea>
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
    }
</style>
