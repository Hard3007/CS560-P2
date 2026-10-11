export class Dropdown {
  constructor(root) {
    this.root = root;
    this.field = root.querySelector('input, select');
    this.searchable = this.field.tagName === 'INPUT';
    this.trigger = this.searchable
      ? this.field
      : root.querySelector('.dropdown-trigger');
    this.menu = root.querySelector('[role="listbox"]');
    this.toggle = root.querySelector('.dropdown-toggle');
    this.options = this.searchable
      ? [{ value: '', label: 'All categories' }]
      : [];
    this.activeIndex = -1;
    this.typeahead = '';

    this.trigger.addEventListener('keydown', (event) => this.onKeydown(event));
    if (this.searchable) {
      this.trigger.addEventListener('focus', () => this.open());
      this.trigger.addEventListener('click', () => {
        if (this.menu.hidden) this.open();
      });
      this.field.addEventListener('input', () => this.open());
    } else {
      this.trigger.addEventListener('click', () =>
        this.menu.hidden ? this.open() : this.close(),
      );
      this.field.addEventListener('change', () => this.sync());
    }
    this.toggle?.addEventListener('pointerdown', (event) =>
      event.preventDefault(),
    );
    this.toggle?.addEventListener('click', () => {
      if (!this.menu.hidden) this.close();
      else {
        this.trigger.focus({ preventScroll: true });
        this.open(true);
      }
    });
    this.menu.addEventListener('pointerdown', (event) =>
      event.preventDefault(),
    );
    this.menu.addEventListener('click', (event) => {
      const option = event.target.closest('[role="option"]');
      if (option) this.choose(Number(option.dataset.index));
    });
    this.root.addEventListener('focusout', () => {
      queueMicrotask(() => {
        if (!this.root.contains(document.activeElement)) this.close();
      });
    });
    document.addEventListener('pointerdown', (event) => {
      if (!this.root.contains(event.target)) this.close();
    });
    window.addEventListener('resize', () => {
      if (!this.menu.hidden) this.position();
    });
    this.sync();
  }

  setOptions(options) {
    this.options = options;
    if (!this.menu.hidden) this.render();
  }

  sync() {
    if (!this.searchable) {
      this.options = [...this.field.options].map((option) => ({
        value: option.value,
        label: option.textContent,
      }));
      this.trigger.querySelector('span').textContent =
        this.field.selectedOptions[0]?.textContent ||
        this.options[0]?.label ||
        '';
      this.trigger.disabled = this.field.disabled;
    }
    this.close();
  }

  render(all = false) {
    const query =
      this.searchable && !all ? this.field.value.trim().toLowerCase() : '';
    this.visible = this.options.filter(
      (option) => !option.value || option.label.toLowerCase().includes(query),
    );
    this.activeIndex = -1;
    this.trigger.removeAttribute('aria-activedescendant');
    const nodes = this.visible.map((option, index) => {
      const node = document.createElement('div');
      node.id = `${this.menu.id}-${index}`;
      node.className = 'dropdown-option';
      node.setAttribute('role', 'option');
      node.setAttribute('aria-label', option.label);
      node.setAttribute(
        'aria-selected',
        String(option.value === this.field.value),
      );
      node.dataset.index = index;
      node.textContent = option.label;
      return node;
    });
    if (query && this.visible.length === 1) {
      const empty = document.createElement('div');
      empty.className = 'dropdown-empty';
      empty.textContent = 'No matching categories';
      nodes.push(empty);
    }
    this.menu.replaceChildren(...nodes);
    this.menu.scrollTop = 0;
  }

  open(all = false) {
    if (this.field.disabled) return;
    this.render(all);
    this.menu.hidden = false;
    this.trigger.setAttribute('aria-expanded', 'true');
    this.toggle?.setAttribute('aria-expanded', 'true');
    this.position();
    if (!this.searchable)
      this.activate(
        this.visible.findIndex((option) => option.value === this.field.value),
      );
  }

  close() {
    this.menu.hidden = true;
    this.trigger.setAttribute('aria-expanded', 'false');
    this.toggle?.setAttribute('aria-expanded', 'false');
    this.trigger.removeAttribute('aria-activedescendant');
    this.activeIndex = -1;
  }

  position() {
    const rect = this.root.getBoundingClientRect();
    const viewport = window.visualViewport;
    const bottom = viewport
      ? viewport.height + viewport.offsetTop
      : window.innerHeight;
    const below = bottom - rect.bottom;
    const above = rect.top - (viewport?.offsetTop || 0);
    const upward = below < 180 && above > below;
    this.root.classList.toggle('dropdown-upward', upward);
    this.menu.style.maxHeight = `${Math.max(80, Math.min(280, (upward ? above : below) - 12))}px`;
  }

  activate(index) {
    if (!this.visible.length) return;
    this.activeIndex = Math.max(0, Math.min(index, this.visible.length - 1));
    for (const node of this.menu.querySelectorAll('[role="option"]'))
      node.classList.toggle(
        'is-active',
        Number(node.dataset.index) === this.activeIndex,
      );
    const node = this.menu.querySelector(`[data-index="${this.activeIndex}"]`);
    this.trigger.setAttribute('aria-activedescendant', node.id);
    node.scrollIntoView({ block: 'nearest' });
  }

  choose(index) {
    const option = this.visible[index];
    if (!option) return;
    this.field.value = option.value;
    this.sync();
    this.field.dispatchEvent(new Event('input', { bubbles: true }));
    this.field.dispatchEvent(new Event('change', { bubbles: true }));
    this.close();
  }

  onKeydown(event) {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      if (!this.menu.hidden) {
        event.preventDefault();
        event.stopPropagation();
        this.close();
      }
      return;
    }
    if (event.key === 'Tab') {
      this.close();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.menu.hidden) {
        this.open();
        if (this.searchable && event.key === 'ArrowUp')
          this.activate(this.visible.length - 1);
      } else
        this.activate(this.activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
      return;
    }
    if (event.key === 'Enter' || (!this.searchable && event.key === ' ')) {
      if (this.menu.hidden && !this.searchable) {
        event.preventDefault();
        this.open();
      } else if (!this.menu.hidden && this.activeIndex >= 0) {
        event.preventDefault();
        this.choose(this.activeIndex);
      } else this.close();
      return;
    }
    if (this.searchable) return;
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (this.menu.hidden) this.open();
      this.activate(event.key === 'Home' ? 0 : this.visible.length - 1);
      return;
    }
    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      if (this.menu.hidden) this.open();
      this.typeahead += event.key.toLowerCase();
      clearTimeout(this.typeaheadTimer);
      this.typeaheadTimer = setTimeout(() => {
        this.typeahead = '';
      }, 500);
      const index = this.visible.findIndex((option) =>
        option.label.toLowerCase().startsWith(this.typeahead),
      );
      if (index >= 0) this.activate(index);
    }
  }
}
