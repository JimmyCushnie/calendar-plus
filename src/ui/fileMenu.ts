import { Menu } from "obsidian";
import type { App, Point, TFile } from "obsidian";

import type { AppWithDeletePrompt } from "src/types/obsidian-internal";

export function showFileMenu(
  app: App,
  file: TFile,
  position: Point,
  // Optional hook to add caller-specific items (e.g. the feature-image
  // toggle) before the standard file-menu items.
  addExtraItems?: (menu: Menu) => void
): void {
  const fileMenu = new Menu();
  addExtraItems?.(fileMenu);
  fileMenu.addItem((item) =>
    item
      .setTitle("Delete")
      .setIcon("trash")
      .onClick(() => {
        (app as AppWithDeletePrompt).fileManager.promptForFileDeletion(file);
      })
  );
  fileMenu.addItem((item) =>
    item
      .setTitle("Open in new tab")
      .setIcon("file-plus")
      .setSection("open")
      .onClick(() => {
        void app.workspace.openLinkText(file.path, "", true);
      })
  );
  app.workspace.trigger(
    "file-menu",
    fileMenu,
    file,
    "calendar-context-menu",
    null
  );
  fileMenu.showAtPosition(position);
}
