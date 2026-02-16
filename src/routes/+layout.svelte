<script lang="ts">
	import favicon from "$lib/assets/favicon.svg";
	import Toasts from "$lib/components/Toasts.svelte";
	import "../app.css";

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Toasts />
{@render children()}
