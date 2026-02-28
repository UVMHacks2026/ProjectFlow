<script lang="ts">
import { register } from "$lib/api/login";
import LoginForm from "$lib/components/forms/login_form.svelte";

let status: any= $state();
let message: string = $state("")


async function registerSubmit(username: string, password: string)
{
  let response = await register(username, password);
}

</script>

<main>
  <LoginForm onSubmit={registerSubmit}/>

  <h2>
    sign-up
  </h2>

  {#if message}
    {message}
  {:else}
    enter username and password
  {/if}

</main>
