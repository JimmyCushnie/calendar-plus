import { Menu } from "obsidian";
import type { App, Point, TFile } from "obsidian";

import type { AppWithDeletePrompt } from "src/types/obsidian-internal";

export function showFileMenu(app: App, file: TFile, position: Point): void {
  const fileMenu = new Menu();
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
