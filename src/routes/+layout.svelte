<script lang="ts">
    import { setMessageThreadContext } from '@/stores/message-thread.svelte';
    import { setAppPrefsContext } from '@/stores/app-prefs.svelte';

	import '../app.css';
	
	let { children } = $props();

    setMessageThreadContext();
    setAppPrefsContext();
</script>

{@render children()}
