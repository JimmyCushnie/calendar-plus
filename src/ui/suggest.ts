import { Scope } from "obsidian";
import type { App } from "obsidian";

// Lightweight folder/file autocomplete for text inputs in the settings tab.
// Ported from the Daily Checklist plugin's no-Popper autocomplete. Visual
// styling is inherited from Obsidian's native .suggestion-container /
// .suggestion-item / .is-selected classes; .calendar-plus-suggest in
// styles.css adds bounded height + z-index. Position is set inline at
// runtime so the dropdown matches the input's bounding rect.

export abstract class TextInputSuggest<T> {
  protected app: App;
  protected inputEl: HTMLInputElement;

  private suggestEl: HTMLDivElement;
  private listEl: HTMLDivElement;
  private suggestionEls: HTMLDivElement[] = [];
  private values: T[] = [];
  private selectedIdx = 0;
  private isOpen = false;
  private scope: Scope;
  private repositionListener: () => void;
  private blurTimeout: number | null = null;

  constructor(app: App, inputEl: HTMLInputElement) {
    this.app = app;
    this.inputEl = inputEl;

    this.scope = new Scope();
    this.scope.register([], "ArrowDown", (e) => {
      if (e.isComposing) return;
      this.setSelected(this.selectedIdx + 1, true);
      return false;
    });
    this.scope.register([], "ArrowUp", (e) => {
      if (e.isComposing) return;
      this.setSelected(this.selectedIdx - 1, true);
      return false;
    });
    this.scope.register([], "Enter", (e) => {
      if (e.isComposing) return;
      this.commit();
      return false;
    });
    this.scope.register([], "Escape", () => {
      this.close();
      return false;
    });

    this.suggestEl = createDiv({ cls: "suggestion-container calendar-plus-suggest" });
    this.listEl = this.suggestEl.createDiv({ cls: "suggestion" });

    this.inputEl.addEventListener("input", () => this.onInputChanged());
    this.inputEl.addEventListener("focus", () => this.onInputChanged());
    this.inputEl.addEventListener("blur", () => {
      // Short delay so a click on a suggestion item lands before we close.
      if (this.blurTimeout !== null) window.clearTimeout(this.blurTimeout);
      this.blurTimeout = window.setTimeout(() => this.close(), 100);
    });
    this.suggestEl.addEventListener("mousedown", (e) => e.preventDefault());

    // Listeners are attached on open() and detached on close() so they don't
    // leak each time the settings tab is reopened.
    this.repositionListener = () => this.position();
  }

  private onInputChanged(): void {
    const values = this.getSuggestions(this.inputEl.value);
    if (values.length === 0) {
      this.close();
      return;
    }
    this.values = values;
    this.renderAll();
    this.open();
    this.setSelected(0, false);
  }

  private renderAll(): void {
    this.listEl.empty();
    this.suggestionEls = this.values.map((value) => {
      const el = this.listEl.createDiv({ cls: "suggestion-item" });
      this.renderSuggestion(value, el);
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const idx = this.suggestionEls.indexOf(el);
        if (idx === -1) return;
        this.selectedIdx = idx;
        this.commit();
      });
      el.addEventListener("mousemove", () => {
        const idx = this.suggestionEls.indexOf(el);
        if (idx !== -1) this.setSelected(idx, false);
      });
      return el;
    });
  }

  private setSelected(idx: number, scrollIntoView: boolean): void {
    if (this.suggestionEls.length === 0) return;
    const n = this.suggestionEls.length;
    const norm = ((idx % n) + n) % n;
    this.suggestionEls[this.selectedIdx]?.removeClass("is-selected");
    const next = this.suggestionEls[norm];
    next?.addClass("is-selected");
    if (scrollIntoView) next?.scrollIntoView({ block: "nearest" });
    this.selectedIdx = norm;
  }

  private commit(): void {
    const value = this.values[this.selectedIdx];
    if (value !== undefined) this.selectSuggestion(value);
    this.close();
  }

  private position(): void {
    const rect = this.inputEl.getBoundingClientRect();
    const style = this.suggestEl.style;
    style.position = "fixed";
    style.left = `${rect.left}px`;
    style.top = `${rect.bottom + 2}px`;
    style.width = `${rect.width}px`;
  }

  private open(): void {
    if (this.isOpen) {
      this.position();
      return;
    }
    activeDocument.body.appendChild(this.suggestEl);
    this.position();
    window.addEventListener("scroll", this.repositionListener, true);
    window.addEventListener("resize", this.repositionListener);
    this.app.keymap.pushScope(this.scope);
    this.isOpen = true;
  }

  close(): void {
    if (this.blurTimeout !== null) {
      window.clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
    if (!this.isOpen) return;
    window.removeEventListener("scroll", this.repositionListener, true);
    window.removeEventListener("resize", this.repositionListener);
    this.app.keymap.popScope(this.scope);
    this.suggestEl.detach();
    this.isOpen = false;
  }

  abstract getSuggestions(inputStr: string): T[];
  abstract renderSuggestion(item: T, el: HTMLElement): void;
  abstract selectSuggestion(item: T): void;
}
