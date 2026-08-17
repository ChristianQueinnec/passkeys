<script lang="ts">
    import { i18n } from "$lib/stores/useI18n.svelte";
    import favicon from "$lib/assets/favicon.svg";

    let { data } = $props();
</script>

<svelte:head>
    <title>About - Passkeys</title>
</svelte:head>

<div class="about-container">
    <div class="card">
        <div class="header">
            <img src={favicon} alt="Passkeys Logo" class="logo" />
            <h1>Passkeys</h1>
        </div>

        <p>{i18n.t("app.description")}</p>

        <div class="content">
            <div class="info-row">
                <span class="label">Date:</span>
                <span class="value">{data.date}</span>
            </div>
            <div class="info-row">
                <span class="label">Version:</span>
                <span class="value">{data.version}</span>
            </div>
        </div>

        <div class="footer">
            <a href="/" class="back-link">
                <button type="button">{i18n.t("auth.back") || "Back"}</button>
            </a>
        </div>
    </div>
</div>

<style>
    .about-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: #f4f4f4;
    }

    .card {
        width: 100%;
        max-width: 400px;
        padding: 2rem;
        text-align: center;
    }

    .header {
        margin-bottom: 2rem;
    }

    .logo {
        width: 64px;
        height: 64px;
        margin-bottom: 1rem;
    }

    h1 {
        margin: 0;
        color: #333;
        font-size: 1.5rem;
    }

    .content {
        text-align: left;
        margin-bottom: 2rem;
    }

    .info-row {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px solid #eee;
    }

    .info-row:last-child {
        border-bottom: none;
    }

    .label {
        font-weight: bold;
        color: #666;
    }

    .value {
        font-family: monospace;
        color: #333;
    }

    .footer {
        margin-top: 1rem;
    }

    .back-link {
        text-decoration: none;
    }

    button {
        width: 100%;
    }
</style>
