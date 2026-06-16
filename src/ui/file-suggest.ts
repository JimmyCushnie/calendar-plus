import { AbstractInputSuggest, TFile, TFolder } from "obsidian";
import type { App } from "obsidian";

// Folder / template-file autocomplete for the settings tab, built on
// Obsidian's native AbstractInputSuggest (positioning, keyboard nav, popup
// lifecycle, and keymap scope are all handled by Obsidian). Each subclass
// keeps the same `(app, inputEl)` constructor and a `selectSuggestion` that
// writes the chosen path back and fires an `input` event, so the existing
// `Setting.addText(...).onChange(...)` handlers in settings.ts save on select
// without any call-site changes.

// Cap the rendered suggestion list to keep dropdown DOM cost bounded in large
// vaults. Typing a character or two narrows results well below this.
const MAX_SUGGESTIONS = 200;

export class FileSuggest extends AbstractInputSuggest<TFile> {
  constructor(
    app: App,
    private inputEl: HTMLInputElement
  ) {
    super(app, inputEl);
  }

  getSuggestions(inputStr: string): TFile[] {
    const lower = inputStr.toLowerCase();
    return this.app.vault
      .getAllLoadedFiles()
      .filter(
        (f): f is TFile =>
          f instanceof TFile &&
          f.extension === "md" &&
          f.path.toLowerCase().includes(lower)
      )
      .sort((a, b) => a.path.localeCompare(b.path))
      .slice(0, MAX_SUGGESTIONS);
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.setText(file.path);
  }

  selectSuggestion(file: TFile): void {
    this.setValue(file.path);
    this.inputEl.trigger("input");
    this.close();
  }
}

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
  constructor(
    app: App,
    private inputEl: HTMLInputElement
  ) {
    super(app, inputEl);
  }

  getSuggestions(inputStr: string): TFolder[] {
    const lower = inputStr.toLowerCase();
    return this.app.vault
      .getAllLoadedFiles()
      .filter(
        (f): f is TFolder =>
          f instanceof TFolder && f.path.toLowerCase().includes(lower)
      )
      .sort((a, b) => a.path.localeCompare(b.path))
      .slice(0, MAX_SUGGESTIONS);
  }

  renderSuggestion(folder: TFolder, el: HTMLElement): void {
    el.setText(folder.path);
  }

  selectSuggestion(folder: TFolder): void {
    this.setValue(folder.path);
    this.inputEl.trigger("input");
    this.close();
  }
}
