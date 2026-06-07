/**
 * sidebar.js — renders and manages the person filter sidebar
 */

const Sidebar = (() => {

  const render = () => {
    const app  = document.getElementById('app');
    const list = document.getElementById('person-list');

    // Apply sidebar position from config
    if (CONFIG.sidebarPosition === 'right') {
      app.classList.add('sidebar-right');
    }

    // Render person items
    list.innerHTML = '';
    CONFIG.people.forEach((person, personId) => {
      const item = document.createElement('li');
      item.className = 'person-item';
      item.setAttribute('tabindex', '0');
      item.dataset.personId = personId;

      // Store colour as CSS variable for the checkbox tint
      item.style.setProperty('--person-colour', person.colour);

      const state = State.get();
      if (state.visibility[personId]) item.classList.add('active');

      item.innerHTML = `
        <span class="person-dot" style="background:${person.colour}"></span>
        <span class="person-name">${person.name}</span>
        <span class="person-check" aria-label="Toggle ${person.name}">
          <svg viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      `;

      // Click / Enter to toggle
      const toggle = () => {
        State.togglePerson(personId);
        updateItem(item, personId);
      };

      item.addEventListener('click', toggle);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });

      list.appendChild(item);
    });
  };

  const updateItem = (item, personId) => {
    const visible = State.get().visibility[personId];
    item.classList.toggle('active', visible);
  };

  /** Update the "last updated" footer label */
  const setLastUpdated = (date) => {
    const el = document.getElementById('last-updated');
    if (!el) return;
    el.textContent = `Updated ${Utils.timeStr(date)}`;
  };

  // Re-sync checkboxes if visibility changes externally (e.g. keyboard shortcut)
  State.onChange((keys) => {
    if (!keys.includes('visibility')) return;
    const state = State.get();
    document.querySelectorAll('.person-item').forEach(item => {
      const id = parseInt(item.dataset.personId, 10);
      item.classList.toggle('active', !!state.visibility[id]);
    });
  });

  return { render, setLastUpdated };
})();
