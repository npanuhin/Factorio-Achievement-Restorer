import { t, getLanguage } from './i18n';

const FLAGS: Record<string, string> = {
  en: '🇬🇧',
  ru: '🇷🇺',
  de: '🇩🇪',
  zh: '🇨🇳',
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

    for (const opt of this.options) {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = opt.getAttribute('data-value') || '';
        this.selectOption(val);
        this.close();
      });
    }

    // Set initial active
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
    for (const opt of this.options) {
      const isSelected = opt.getAttribute('data-value') === val;
      opt.classList.toggle('selected', isSelected);
      opt.setAttribute('aria-selected', isSelected ? 'true' : 'false');
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
    this.menu.classList.add('open');
    this.trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', this.boundClickOutside);
    document.addEventListener('keydown', this.boundKeydown);
  }

  private close(): void {
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

  private onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.close();
      this.trigger.focus();
    }
  }
}
