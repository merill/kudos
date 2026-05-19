<script>
  import { Github, ImagePlus, LogIn, Plus, Save, ShieldCheck } from 'lucide-svelte';
  import { animate, frame, inView } from 'motion';
  import kudos from './lib/kudos.json';
  import { silhouetteFor } from './lib/silhouettes.js';

  const postUrl =
    'https://www.linkedin.com/posts/merill_hey-folks-some-personal-news-im-leaving-activity-7460694824514404352-bUWv/';

  // Pointer-tracked tilt — adapted from Motion's official "Tilt card" example:
  // https://examples.motion.dev/js/tilt-card
  // Same structure (frame.postRender + Motion's default spring), tuned gentler
  // for content cards. Skipped for reduced-motion and coarse (touch) pointers.
  function tilt(node) {
    if (typeof window === 'undefined') return {};
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduced || coarse) return {};

    const maxTilt = 7;
    const state = { z: 0, rotateX: 0, rotateY: 0 };

    const calculateTilt = (event) => {
      const rect = node.getBoundingClientRect();
      state.z = -8;
      const xPercent = (event.clientX - rect.left) / rect.width;
      const yPercent = (event.clientY - rect.top) / rect.height;
      state.rotateX = maxTilt * (0.5 - yPercent);
      state.rotateY = maxTilt * (xPercent - 0.5);
    };

    const animateToTilt = () => {
      animate(node, {
        transformPerspective: 600,
        rotateX: state.rotateX,
        rotateY: state.rotateY,
        z: state.z,
      });
    };

    const updateTilt = (e) => {
      calculateTilt(e);
      frame.postRender(animateToTilt);
    };

    const onLeave = () => {
      state.z = 0;
      state.rotateX = 0;
      state.rotateY = 0;
      frame.postRender(animateToTilt);
    };

    node.addEventListener('pointerenter', updateTilt);
    node.addEventListener('pointermove', updateTilt);
    node.addEventListener('pointerleave', onLeave);

    return {
      destroy() {
        node.removeEventListener('pointerenter', updateTilt);
        node.removeEventListener('pointermove', updateTilt);
        node.removeEventListener('pointerleave', onLeave);
      },
    };
  }

  let isAdmin = window.location.pathname.replace(/\/$/, '') === '/admin';

  // Fade + lift cards into view as they enter the viewport.
  // Based on Motion's inView pattern: https://motion.dev/docs/inview
  function revealOnScroll(node) {
    if (typeof window === 'undefined') return {};
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const cards = node.querySelectorAll('.kudo-card');

    if (reduced) {
      // Show everything immediately for reduced-motion users.
      cards.forEach((el) => {
        el.classList.remove('is-pending');
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return {};
    }

    // Mark every card as a shimmering placeholder up front so cards below
    // the fold shimmer until they scroll into view.
    cards.forEach((el) => el.classList.add('is-pending'));

    const stop = inView(
      cards,
      (element) => {
        element.classList.remove('is-pending');
        animate(
          element,
          { opacity: [0, 1], y: [18, 0] },
          { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
        );
      },
      // Fire as soon as any part of the card enters the viewport. This keeps
      // browser find-in-page working: when Ctrl/Cmd+F scrolls to a match,
      // the card reveals immediately at whichever edge it appears.
      { amount: 'some' },
    );

    return {
      destroy() {
        stop();
      },
    };
  }

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

      <div class="kudos-grid" use:revealOnScroll>
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
