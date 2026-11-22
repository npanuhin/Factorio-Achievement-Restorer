import { t, getLanguage } from './i18n';

const FLAGS: Record<string, string> = {
  en: '🇬🇧',
  cs: '🇨🇿',
  da: '🇩🇰',
  de: '🇩🇪',
  es: '🇪🇸',
  fr: '🇫🇷',
  it: '🇮🇹',
  hu: '🇭🇺',
  nl: '🇳🇱',
  no: '🇳🇴',
  pl: '🇵🇱',
  pt: '🇧🇷',
  ro: '🇷🇴',
  sv: '🇸🇪',
  tr: '🇹🇷',
  vi: '🇻🇳',
  ru: '🇷🇺',
  uk: '🇺🇦',
  th: '🇹🇭',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
};

export interface CustomSelectOptions {
  wrap: HTMLElement;
  onChange?: (value: string) => void;
}

export class CustomSelect {
  private readonly wrap: HTMLElement;
  private readonly trigger: HTMLButtonElement;
  private readonly label: HTMLElement;
  private readonly menu: HTMLElement;
  private readonly options: HTMLElement[];
  private readonly onChange?: (value: string) => void;

  private searchBuffer = '';
  private searchTimeout: number | null = null;
  private focusedIndex = -1;

  private boundClickOutside: (e: MouseEvent) => void;
  private boundKeydown: (e: KeyboardEvent) => void;

  constructor(opts: CustomSelectOptions) {
    this.wrap = opts.wrap;
    this.onChange = opts.onChange;

    this.trigger = this.wrap.querySelector('.custom-select-trigger') as HTMLButtonElement;
    this.label = this.wrap.querySelector('.custom-select-label') as HTMLElement;
    this.menu = this.wrap.querySelector('.custom-select-menu') as HTMLElement;
    this.options = Array.from(this.wrap.querySelectorAll('.custom-select-option'));

    this.boundClickOutside = (e: MouseEvent) => this.onClickOutside(e);
    this.boundKeydown = (e: KeyboardEvent) => this.onKeydown(e);

    this.init();
  }

  private init(): void {
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    for (let i = 0; i < this.options.length; i++) {
      const opt = this.options[i];
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = opt.getAttribute('data-value') || '';
        this.selectOption(val);
        this.close();
      });

      opt.addEventListener('mouseenter', () => {
        this.setFocusedIndex(i);
      });
    }

    const cur = getLanguage();
    this.updateActive(cur);
  }

  public setValue(val: string): void {
    this.selectOption(val);
  }

  public updateLabels(): void {
    for (const opt of this.options) {
      const val = opt.getAttribute('data-value') || '';
      const textSpan = opt.querySelector('.custom-select-text');
      if (textSpan) {
        textSpan.textContent = t(`lang_${val}`);
      }
    }
    const cur = getLanguage();
    this.updateActive(cur);
  }

  private selectOption(val: string): void {
    this.updateActive(val);
    if (this.onChange) {
      this.onChange(val);
    }
  }

  private updateActive(val: string): void {
    for (let idx = 0; idx < this.options.length; idx++) {
      const opt = this.options[idx];
      const isSelected = opt.getAttribute('data-value') === val;
      opt.classList.toggle('selected', isSelected);
      opt.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      if (isSelected) {
        this.focusedIndex = idx;
      }
    }

    const flagEmoji = FLAGS[val] || '';
    const labelText = t(`lang_${val}`);
    this.label.innerHTML = `
      <span class="custom-select-flag">${flagEmoji}</span>
      <span class="custom-select-text">${labelText}</span>
    `;
  }

  private toggle(): void {
    if (this.menu.classList.contains('open')) {
      this.close();
    } else {
      this.open();
    }
  }

  private open(): void {
    this.resetFilter();
    this.menu.classList.add('open');
    this.trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', this.boundClickOutside);
    document.addEventListener('keydown', this.boundKeydown);

    const selected = this.menu.querySelector('.custom-select-option.selected') as HTMLElement;
    if (selected) {
      this.setFocusedElement(selected);
      selected.scrollIntoView({ block: 'nearest' });
    }
  }

  private close(): void {
    this.resetFilter();
    this.menu.classList.remove('open');
    this.trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', this.boundClickOutside);
    document.removeEventListener('keydown', this.boundKeydown);
  }

  private onClickOutside(e: MouseEvent): void {
    if (!this.wrap.contains(e.target as Node)) {
      this.close();
    }
  }

  private getVisibleOptions(): HTMLElement[] {
    return this.options.filter(opt => !opt.classList.contains('hidden'));
  }

  private setFocusedIndex(idx: number): void {
    this.focusedIndex = idx;
    for (let i = 0; i < this.options.length; i++) {
      this.options[i].classList.toggle('focused', i === idx);
    }
  }

  private setFocusedElement(el: HTMLElement | null): void {
    if (!el) {
      this.setFocusedIndex(-1);
      return;
    }
    const idx = this.options.indexOf(el);
    this.setFocusedIndex(idx);
    el.scrollIntoView({ block: 'nearest' });
  }

  private resetFilter(): void {
    this.searchBuffer = '';
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    for (const opt of this.options) {
      opt.classList.remove('hidden');
    }
  }

  private filterAndSearch(query: string): void {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.resetFilter();
      return;
    }

    interface ScoredOption {
      el: HTMLElement;
      score: number;
    }

    const scored: ScoredOption[] = [];

    for (const opt of this.options) {
      const val = (opt.getAttribute('data-value') || '').toLowerCase();
      const text = (opt.querySelector('.custom-select-text')?.textContent || '').toLowerCase();

      let score = 2;
      if (text.startsWith(q) || val.startsWith(q)) {
        score = 0;
      } else if (text.includes(q) || val.includes(q)) {
        score = 1;
      }

      scored.push({ el: opt, score });
    }

    for (const item of scored) {
      item.el.classList.toggle('hidden', item.score === 2);
    }

    const visible = scored.filter(s => s.score < 2);
    visible.sort((a, b) => a.score - b.score);

    for (const item of visible) {
      this.menu.appendChild(item.el);
    }

    if (visible.length > 0) {
      this.setFocusedElement(visible[0].el);
    } else {
      this.setFocusedElement(null);
    }
  }

  private onKeydown(e: KeyboardEvent): void {
    const isOpen = this.menu.classList.contains('open');

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.open();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      this.trigger.focus();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.navigate(1);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.navigate(-1);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const visible = this.getVisibleOptions();
      const focused = this.options[this.focusedIndex];
      const target = (focused && visible.includes(focused)) ? focused : visible[0];
      if (target) {
        const val = target.getAttribute('data-value') || '';
        this.selectOption(val);
        this.close();
        this.trigger.focus();
      }
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (this.searchBuffer.length > 0) {
        this.searchBuffer = this.searchBuffer.slice(0, -1);
        this.filterAndSearch(this.searchBuffer);
      }
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      this.searchBuffer += e.key;

      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      this.searchTimeout = window.setTimeout(() => {
        this.searchBuffer = '';
      }, 1500);

      this.filterAndSearch(this.searchBuffer);
    }
  }

  private navigate(direction: number): void {
    const visible = this.getVisibleOptions();
    if (visible.length === 0) return;

    const currentFocused = this.options[this.focusedIndex];
    let visibleIndex = currentFocused ? visible.indexOf(currentFocused) : -1;

    visibleIndex += direction;
    if (visibleIndex < 0) visibleIndex = visible.length - 1;
    if (visibleIndex >= visible.length) visibleIndex = 0;

    this.setFocusedElement(visible[visibleIndex]);
  }
}
