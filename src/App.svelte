<script>
  import { Github, ImagePlus, LogIn, Plus, Save, ShieldCheck } from 'lucide-svelte';
  import kudos from './lib/kudos.json';
  import { silhouetteFor } from './lib/silhouettes.js';

  const postUrl =
    'https://www.linkedin.com/posts/merill_hey-folks-some-personal-news-im-leaving-activity-7460694824514404352-bUWv/';

  // Subtle pointer-tracked tilt. Max ~5deg, eases back on leave.
  // Respects prefers-reduced-motion and skips coarse pointers (touch).
  function tilt(node) {
    if (typeof window === 'undefined') return {};
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduced || coarse) return {};

    const MAX_TILT = 2.2; // degrees
    const LIFT = 2; // px translateZ-equivalent lift
    let frame = 0;
    let active = false;

    const setVars = (rx, ry, lift) => {
      node.style.setProperty('--tilt-x', `${rx}deg`);
      node.style.setProperty('--tilt-y', `${ry}deg`);
      node.style.setProperty('--tilt-lift', `${lift}px`);
    };

    const onMove = (event) => {
      const rect = node.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width; // 0..1
      const py = (event.clientY - rect.top) / rect.height; // 0..1
      const ry = (px - 0.5) * 2 * MAX_TILT; // left/right -> rotateY
      const rx = (0.5 - py) * 2 * MAX_TILT; // up/down  -> rotateX
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setVars(rx, ry, LIFT));
    };

    const onEnter = () => {
      active = true;
      node.classList.add('is-tilting');
    };

    const onLeave = () => {
      active = false;
      cancelAnimationFrame(frame);
      node.classList.remove('is-tilting');
      setVars(0, 0, 0);
    };

    node.addEventListener('pointerenter', onEnter);
    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerleave', onLeave);

    return {
      destroy() {
        cancelAnimationFrame(frame);
        node.removeEventListener('pointerenter', onEnter);
        node.removeEventListener('pointermove', onMove);
        node.removeEventListener('pointerleave', onLeave);
        if (active) onLeave();
      },
    };
  }

  let isAdmin = window.location.pathname.replace(/\/$/, '') === '/admin';

  // Fisher–Yates shuffle so the wall feels fresh on every visit.
  // The admin view keeps the original order so entries are easy to find.
  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  const displayKudos = isAdmin ? kudos : shuffle(kudos);

  let selectedId = '';
  let status = '';
  let user = null;
  let busy = false;
  let form = blankKudo();

  function blankKudo() {
    return {
      id: '',
      quote: '',
      name: '',
      title: '',
      source: '',
      sourceLabel: '',
      avatarDataUrl: '',
    };
  }

  function editKudo(id) {
    const item = kudos.find((entry) => entry.id === id);
    selectedId = id;
    form = item
      ? {
          id: item.id,
          quote: item.quote,
          name: item.name,
          title: item.title || '',
          source: item.source || '',
          sourceLabel: item.sourceLabel || '',
          avatarDataUrl: '',
        }
      : blankKudo();
  }

  function newKudo() {
    selectedId = '';
    form = blankKudo();
    status = '';
  }

  async function loadUser() {
    if (!isAdmin) return;
    try {
      const response = await fetch('/api/github/me');
      if (response.ok) user = await response.json();
    } catch {
      user = null;
    }
  }

  function signIn() {
    window.location.href = '/api/github/login';
  }

  async function readAvatar(event) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    form.avatarDataUrl = await resizeImage(file);
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 240;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          const scale = Math.max(size / img.width, size / img.height);
          const width = img.width * scale;
          const height = img.height * scale;
          ctx.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.86));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function saveKudo() {
    busy = true;
    status = 'Saving...';
    try {
      const response = await fetch('/api/github/commit-kudo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Save failed');
      status = `Saved. Commit ${result.commitSha.slice(0, 7)} will rebuild the site.`;
      if (!form.id) form.id = result.id;
    } catch (error) {
      status = error.message;
    } finally {
      busy = false;
    }
  }

  loadUser();
</script>

{#if isAdmin}
  <main class="admin-shell">
    <section class="admin-panel">
      <div class="admin-heading">
        <div>
          <p class="eyebrow">Private editor</p>
          <h1>Kudos Wall Admin</h1>
        </div>
        {#if user}
          <div class="signed-in"><ShieldCheck size={18} /> {user.login}</div>
        {:else}
          <button class="icon-button primary" type="button" on:click={signIn}>
            <LogIn size={18} /> Sign in with GitHub
          </button>
        {/if}
      </div>

      <div class="admin-grid">
        <aside class="editor-list" aria-label="Existing kudos">
          <button class="list-action" type="button" on:click={newKudo}>
            <Plus size={17} /> New kudo
          </button>
          {#each kudos as item}
            <button
              class:active={item.id === selectedId}
              class="list-item"
              type="button"
              on:click={() => editKudo(item.id)}
            >
              <span>{item.name}</span>
              <small>{item.title || 'No title'}</small>
            </button>
          {/each}
        </aside>

        <form class="kudo-form" on:submit|preventDefault={saveKudo}>
          <label>
            Quote
            <textarea bind:value={form.quote} rows="8" required></textarea>
          </label>
          <div class="field-row">
            <label>
              Name
              <input bind:value={form.name} required />
            </label>
            <label>
              Title
              <input bind:value={form.title} />
            </label>
          </div>
          <div class="field-row">
            <label>
              Source URL
              <input bind:value={form.source} placeholder={postUrl} />
            </label>
            <label>
              Source label
              <input bind:value={form.sourceLabel} placeholder="LinkedIn" />
            </label>
          </div>
          <label class="upload-field">
            <ImagePlus size={18} />
            <span>{form.avatarDataUrl ? 'Avatar ready' : 'Upload avatar image'}</span>
            <input accept="image/*" type="file" on:change={readAvatar} />
          </label>
          <button class="icon-button primary" disabled={!user || busy} type="submit">
            <Save size={18} /> Save to GitHub
          </button>
          {#if status}<p class="status">{status}</p>{/if}
        </form>
      </div>
    </section>
  </main>
{:else}
  <main class="site-shell">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Kudos Wall</p>
        <h1>Kudos Wall</h1>
        <p class="note">
          I’m Merill Fernando. I’m humbled that so many people believe in me, and
          I never want to let them down. I keep these kind notes here as a small
          reminder to stay motivated, and I thank everyone who has given me the
          privilege of helping them along the way.
        </p>
      </div>
      <figure class="hero-portrait">
        <img src="/merill.jpg" alt="Merill Fernando" width="220" height="220" />
        <figcaption>Merill Fernando</figcaption>
      </figure>
    </section>

    <section class="kudos-section" aria-labelledby="kudos-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">What people are saying</p>
          <h2 id="kudos-title">Kind words from the community</h2>
        </div>
        <span>{kudos.length} notes</span>
      </div>

      <div class="kudos-grid">
        {#each displayKudos as item}
          <svelte:element
            this={item.source ? 'a' : 'article'}
            class="kudo-card"
            class:linked={!!item.source}
            href={item.source || undefined}
            target={item.source ? '_blank' : undefined}
            rel={item.source ? 'noreferrer' : undefined}
            aria-label={item.source ? `Open ${item.sourceLabel || 'source'} for ${item.name}` : undefined}
            use:tilt
          >
            <p class="quote">“{item.quote}”</p>
            <div class="person-row">
              {#if item.avatar}
                <img class="avatar" src={item.avatar} alt="" loading="lazy" />
              {:else}
                {@const colors = silhouetteFor(item.name)}
                <div
                  class="avatar silhouette"
                  style={`--skin:${colors[0]};--shirt:${colors[1]};--bg:${colors[2]};`}
                  aria-hidden="true"
                >
                  <span></span>
                </div>
              {/if}
              <div class="person-copy">
                <strong>{item.name}</strong>
                {#if item.title}<span title={item.title}>{item.title}</span>{/if}
              </div>
            </div>
          </svelte:element>
        {/each}
      </div>
    </section>
  </main>
{/if}
