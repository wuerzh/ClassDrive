import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesPath = resolve("src/styles.css");
const sourceRoot = resolve("src");

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = resolve(dir, name);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      return listSourceFiles(path);
    }
    return path.endsWith(".vue") ? [path] : [];
  });
}

describe("shared styles", () => {
  it("publishes ClassDrive favicon and brand logo assets", () => {
    const indexHtml = readFileSync(resolve("index.html"), "utf8");
    const css = readFileSync(stylesPath, "utf8");

    expect(indexHtml).toMatch(/<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg" \/>/);
    expect(indexHtml).toMatch(/<link rel="alternate icon" href="\/favicon\.ico" \/>/);
    expect(css).toMatch(/\.brand-logo\s*\{[\s\S]*?width:\s*40px;[\s\S]*?height:\s*40px;/);
    expect(css).toMatch(/\.login-card__brand-logo\s*\{[\s\S]*?width:\s*64px;[\s\S]*?height:\s*64px;/);
  });

  it("keeps toasts above the sticky topbar but below modal dialogs", () => {
    const css = readFileSync(stylesPath, "utf8");
    const toastStack = readFileSync(resolve(sourceRoot, "components", "ToastStack.vue"), "utf8");

    expect(css).toMatch(/\.topbar\s*\{[\s\S]*?z-index:\s*1000;/);
    expect(toastStack).toMatch(/\.toast-stack\s*\{[\s\S]*?z-index:\s*2100;/);
    expect(css).toMatch(/\.copy-dialog-backdrop\s*\{[\s\S]*?z-index:\s*5000;/);
  });

  it("keeps reusable buttons on one line to avoid split action labels", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toMatch(/\.button\s*\{[\s\S]*?white-space:\s*nowrap;/);
  });

  it("uses compact shared controls and data tables for high-density pages", () => {
    const css = readFileSync(stylesPath, "utf8");
    const studentsView = readFileSync(resolve(sourceRoot, "views", "StudentsView.vue"), "utf8");
    const studentRosterPanel = readFileSync(resolve(sourceRoot, "components", "StudentRosterPanel.vue"), "utf8");
    const assignmentDetail = readFileSync(resolve(sourceRoot, "views", "AssignmentDetailView.vue"), "utf8");

    expect(css).toMatch(/\.button\s*\{[\s\S]*?min-height:\s*34px;/);
    expect(css).toMatch(/\.button\s*\{[\s\S]*?padding:\s*6px 10px;/);
    expect(css).toMatch(/\.files-table th,\s*\.files-table td\s*\{[\s\S]*?padding:\s*0\.45rem 0\.6rem;/);
    expect(css).toMatch(/\.classes-page__board\s*\{[\s\S]*?gap:\s*8px;/);
    expect(studentsView).toMatch(/\.students-page__toolbar\s*\{[\s\S]*?padding-bottom:\s*8px;/);
    expect(studentsView).toMatch(/\.students-page__registration-filter\s*\{[\s\S]*?flex:\s*0 0 calc\(\(3em \+ 38px\) \* 1\.2\);[\s\S]*?inline-size:\s*calc\(\(3em \+ 38px\) \* 1\.2\);[\s\S]*?min-width:\s*calc\(\(3em \+ 38px\) \* 1\.2\);/);
    expect(studentsView).toMatch(/\.students-page__registration\s*\{[\s\S]*?min-height:\s*20px;/);
    expect(studentsView).toMatch(/\.students-page__row-actions\s+\.text-button\s*\{[\s\S]*?min-height:\s*24px;/);
    expect(studentsView).toContain("studentRosterFrameStyle");
    expect(studentsView).toContain("students-page__table-frame");
    expect(studentsView).toMatch(/\.students-page__roster-panel\s*\{[\s\S]*?grid-template-rows:\s*max-content max-content max-content;/);
    expect(studentsView).toMatch(/\.students-page__table-frame\s*\{[\s\S]*?min-height:\s*calc\(44px \* \(var\(--student-roster-page-size\) \+ 1\)\);/);
    expect(studentsView).toMatch(/\.students-page__table\s*\{[\s\S]*?height:\s*auto;/);
    expect(studentsView).toMatch(/\.students-page__table\s*\{[\s\S]*?border:\s*0;/);
    expect(studentsView).toMatch(/\.students-page__table thead tr,\s*\.students-page__table tbody tr\s*\{[\s\S]*?height:\s*44px;/);
    expect(studentsView).toMatch(/\.students-page__table th,\s*\.students-page__table td\s*\{[\s\S]*?height:\s*44px;/);
    expect(studentRosterPanel).toMatch(/\.student-roster-panel\s*\{[\s\S]*?align-self:\s*start;/);
    expect(studentRosterPanel).toMatch(/\.student-roster-panel\s*\{[\s\S]*?align-content:\s*start;/);
    expect(studentRosterPanel).toMatch(/\.student-roster-panel\s*\{[\s\S]*?grid-template-rows:\s*max-content max-content max-content;/);
    expect(studentRosterPanel).toMatch(/\.student-roster-panel\s*\{[\s\S]*?justify-items:\s*stretch;/);
    expect(studentRosterPanel).toMatch(/\.students-page__toolbar\s*\{[\s\S]*?align-self:\s*start;/);
    expect(studentRosterPanel).toMatch(/\.students-page__toolbar\s*\{[\s\S]*?min-height:\s*58px;/);
    expect(studentRosterPanel).toMatch(/\.students-page__toolbar-actions\s*\{[\s\S]*?min-height:\s*38px;/);
    expect(studentRosterPanel).toMatch(/\.students-page__search-group\s*\{[\s\S]*?min-height:\s*38px;/);
    expect(studentRosterPanel).toMatch(/\.student-roster-panel\s+\.pagination-controls\s*\{[\s\S]*?align-self:\s*start;/);
    expect(studentRosterPanel).toMatch(/\.student-roster-panel\s+\.pagination-controls\s*\{[\s\S]*?min-height:\s*44px;/);
    expect(studentRosterPanel).toContain("studentRosterFrameStyle");
    expect(studentRosterPanel).toContain("--student-roster-page-size");
    expect(studentRosterPanel).toContain("students-page__table-frame");
    expect(studentRosterPanel).toMatch(/\.students-page__table-frame\s*\{[\s\S]*?align-self:\s*start;/);
    expect(studentRosterPanel).toMatch(/\.students-page__table-frame\s*\{[\s\S]*?min-height:\s*calc\(44px \* \(var\(--student-roster-page-size\) \+ 1\)\);/);
    expect(studentRosterPanel).toMatch(/\.students-page__table\s*\{[\s\S]*?width:\s*100%;/);
    expect(studentRosterPanel).toMatch(/\.students-page__table\s*\{[\s\S]*?height:\s*auto;/);
    expect(studentRosterPanel).toMatch(/\.students-page__table\s*\{[\s\S]*?border:\s*0;/);
    expect(studentRosterPanel).toMatch(/\.students-page__table thead tr,\s*\.students-page__table tbody tr\s*\{[\s\S]*?height:\s*44px;/);
    expect(studentRosterPanel).toMatch(/\.students-page__table th,\s*\.students-page__table td\s*\{[\s\S]*?height:\s*44px;/);
    expect(studentRosterPanel).toMatch(/\.students-page__table th,\s*\.students-page__table td\s*\{[\s\S]*?max-height:\s*44px;/);
    expect(readFileSync(resolve(sourceRoot, "views", "StudentFilesView.vue"), "utf8")).toMatch(/\.student-files-page__card\s*\{[\s\S]*?padding:\s*8px;/);
    const studentAssignmentDetail = readFileSync(resolve(sourceRoot, "views", "StudentAssignmentDetailView.vue"), "utf8");
    expect(studentAssignmentDetail).toMatch(/\.student-assignment-detail__card\s*\{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*18px;/);
    expect(studentAssignmentDetail).toMatch(/\.student-assignment-detail__hero\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;/);
    expect(studentAssignmentDetail).toMatch(/\.student-assignment-detail__requirement-bar\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-wrap:\s*wrap;/);
    expect(studentAssignmentDetail).toMatch(/\.student-assignment-detail__requirement-item\s*\{[\s\S]*?display:\s*flex;[\s\S]*?gap:\s*8px;[\s\S]*?align-items:\s*baseline;/);
    expect(studentAssignmentDetail).not.toContain("student-assignment-detail__card--info");
    expect(studentAssignmentDetail).toMatch(/\.student-assignment-detail__submit-panel\s*\{[\s\S]*?padding-bottom:\s*18px;[\s\S]*?border-bottom:\s*1px solid var\(--border-soft\);/);
    expect(studentAssignmentDetail).toMatch(/\.student-assignment-detail__section-kicker\s*\{[\s\S]*?text-transform:\s*uppercase;[\s\S]*?letter-spacing:\s*0\.05em;/);
    expect(studentAssignmentDetail).not.toContain("student-assignment-detail__requirement--nowrap");
    expect(studentAssignmentDetail).not.toContain("student-assignment-detail__requirement--responsive");
    expect(studentAssignmentDetail).not.toMatch(/(?:^|\n)\.student-assignment-detail__requirement\s*\{[^}]*white-space:\s*nowrap;/);
    expect(studentAssignmentDetail).not.toMatch(/(?:^|\n)\.student-assignment-detail__requirement-value\s*\{[^}]*white-space:\s*nowrap;/);
    const studentFilesView = readFileSync(resolve(sourceRoot, "views", "StudentFilesView.vue"), "utf8");
    const teacherFilesView = readFileSync(resolve(sourceRoot, "views", "FilesView.vue"), "utf8");
    expect(studentFilesView).toMatch(/\.student-files-page__workspace\s*>\s*\.files-toolbar\s*\{[\s\S]*?margin:\s*0;[\s\S]*?width:\s*100%;/);
    expect(studentFilesView).not.toContain("margin-right: -0.75rem;");
    expect(studentFilesView).not.toContain("width: calc(100% + 0.75rem);");
    expect(studentFilesView).toMatch(/\.student-files-page__workspace\s*>\s*\.files-toolbar\s*\{[\s\S]*?--files-search-slot-width:\s*min\(320px,\s*34vw\);/);
    expect(studentFilesView).toMatch(/\.files-toolbar\s*\{[\s\S]*?--files-search-slot-width:\s*min\(420px,\s*44vw\);[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);[\s\S]*?align-items:\s*stretch;[\s\S]*?justify-content:\s*stretch;/);
    expect(teacherFilesView).toMatch(/\.files-toolbar\s*\{[\s\S]*?--files-search-slot-width:\s*min\(240px,\s*24vw\);/);
    expect(studentFilesView).toMatch(/\.files-toolbar__bottom\s*\{[\s\S]*?position:\s*relative;[\s\S]*?padding-right:\s*calc\(var\(--files-search-slot-width\) \+ 10px\);/);
    expect(teacherFilesView).toMatch(/\.files-toolbar__bottom\s*\{[\s\S]*?position:\s*relative;[\s\S]*?padding-right:\s*calc\(var\(--files-search-slot-width\) \+ 10px\);/);
    expect(studentFilesView).toMatch(/\.files-toolbar__search-slot\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?right:\s*0;[\s\S]*?width:\s*var\(--files-search-slot-width\);/);
    expect(teacherFilesView).toMatch(/\.files-toolbar__search-slot\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?right:\s*0;[\s\S]*?width:\s*var\(--files-search-slot-width\);/);
    expect(teacherFilesView).toMatch(/@media\s*\(max-width:\s*1100px\)\s*\{[\s\S]*?\.files-toolbar\s*\{[\s\S]*?--files-search-slot-width:\s*min\(240px,\s*100%\);/);
    expect(teacherFilesView).toMatch(/\.files-grid__card\s*\{[\s\S]*?min-width:\s*0;/);
    expect(teacherFilesView).toMatch(/\.files-grid__title\s*\{[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?word-break:\s*break-word;/);
    expect(studentFilesView).toMatch(/\.student-files-page__actions\s*\{[\s\S]*?flex-wrap:\s*wrap;/);
    expect(assignmentDetail).toMatch(/\.assignment-detail-heading \.classes-page__title\s*\{[\s\S]*?font-size:\s*1\.16rem;/);
    expect(assignmentDetail).toMatch(/\.assignment-submissions-table th,\s*\.assignment-submissions-table td\s*\{[\s\S]*?padding:\s*6px 8px;/);
  });

  it("shows grid thumbnails as complete previews instead of cropped covers", () => {
    const teacherFilesView = readFileSync(resolve(sourceRoot, "views", "FilesView.vue"), "utf8");
    const studentFilesView = readFileSync(resolve(sourceRoot, "views", "StudentFilesView.vue"), "utf8");

    expect(teacherFilesView).toMatch(/\.files-grid__thumbnail-button\s*\{[\s\S]*?aspect-ratio:\s*4 \/ 3;/);
    expect(teacherFilesView).toMatch(/\.files-grid__thumbnail\s*\{[\s\S]*?object-fit:\s*contain;/);
    expect(teacherFilesView).not.toMatch(/\.files-grid__thumbnail\s*\{[\s\S]*?object-fit:\s*cover;/);
    expect(studentFilesView).toMatch(/\.student-files-page__thumbnail-button\s*\{[\s\S]*?aspect-ratio:\s*4 \/ 3;/);
    expect(studentFilesView).toMatch(/\.student-files-page__thumbnail\s*\{[\s\S]*?object-fit:\s*contain;/);
    expect(studentFilesView).not.toMatch(/\.student-files-page__thumbnail\s*\{[\s\S]*?object-fit:\s*cover;/);
  });

  it("keeps the review drawer extra-large submission grid visibly larger", () => {
    const submissionFileGrid = readFileSync(resolve(sourceRoot, "components", "SubmissionFileGrid.vue"), "utf8");

    expect(submissionFileGrid).toMatch(/\.submission-file-grid--xlarge\s+\.submission-file-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(360px,\s*1fr\)\);/);
    expect(submissionFileGrid).toMatch(/\.submission-file-grid__thumb img\s*\{[\s\S]*?object-fit:\s*contain;/);
  });

  it("lets assignment image thumbnails keep their natural full outline", () => {
    const submissionFileGrid = readFileSync(resolve(sourceRoot, "components", "SubmissionFileGrid.vue"), "utf8");

    expect(submissionFileGrid).toContain("submission-file-grid__thumb--image");
    expect(submissionFileGrid).toMatch(/\.submission-file-grid__thumb--image\s*\{[\s\S]*?aspect-ratio:\s*auto;[\s\S]*?overflow:\s*visible;/);
    expect(submissionFileGrid).toMatch(/\.submission-file-grid__thumb--image img\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*auto;[\s\S]*?object-fit:\s*contain;/);
  });

  it("keeps the student shell inside narrow mobile viewports", () => {
    const studentLayout = readFileSync(resolve(sourceRoot, "layouts", "StudentLayout.vue"), "utf8");
    const studentAssignmentDetail = readFileSync(resolve(sourceRoot, "views", "StudentAssignmentDetailView.vue"), "utf8");

    expect(studentLayout).toMatch(/\.student-shell\s+\.shell__content\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*100%;/);
    expect(studentLayout).toMatch(/@media\s*\(max-width:\s*520px\)\s*\{[\s\S]*?\.student-shell__actions\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+auto;/);
    expect(studentLayout).toMatch(/@media\s*\(max-width:\s*520px\)\s*\{[\s\S]*?\.student-shell__user\s*\{[\s\S]*?grid-column:\s*1 \/ -1;/);
    expect(studentAssignmentDetail).not.toContain("student-assignment-detail__header");
    expect(studentAssignmentDetail).toMatch(/@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.student-assignment-detail__hero\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/);
    expect(studentAssignmentDetail).toMatch(/@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.student-assignment-detail__steps\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  });

  it("keeps native select menus legible in dark dialogs", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toMatch(/:root\.dark\s+\.copy-dialog\s+select\s*\{[\s\S]*?background:\s*var\(--control-bg\);[\s\S]*?color:\s*var\(--text-primary\);/);
    expect(css).toMatch(/:root\.dark\s+\.copy-dialog__search\s+option\s*\{[\s\S]*?background:\s*var\(--control-bg\);[\s\S]*?color:\s*var\(--text-primary\);/);
  });

  it("defines button tone variants for dense action toolbars", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toMatch(/\.button--secondary\s*\{/);
    expect(css).toMatch(/\.button--accent\s*\{/);
    expect(css).toMatch(/\.button--warning\s*\{/);
    expect(css).toMatch(/\.button--danger\s*\{/);
    expect(css).toMatch(/:root\.dark\s+\.button--secondary\s*\{/);
    expect(css).toMatch(/:root\.dark\s+\.button--accent\s*\{/);
    expect(css).toMatch(/:root\.dark\s+\.button--warning\s*\{/);
    expect(css).toMatch(/:root\.dark\s+\.button--danger\s*\{/);
  });

  it("distinguishes sidebar group labels from navigation links", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toMatch(/\.sidebar__group-header\s*\{[\s\S]*?border-bottom:\s*1px solid var\(--border-soft\);/);
    expect(css).toMatch(/\.sidebar__group-label\s*\{[\s\S]*?font-size:\s*0\.72rem;/);
  });

  it("keeps sidebar links naturally stacked when the footer is present", () => {
    const css = readFileSync(stylesPath, "utf8");
    const sidebarNavRule = css.match(/\.sidebar__nav\s*\{[^}]*\}/)?.[0] ?? "";
    const sidebarFooterRule = css.match(/\.sidebar__footer\s*\{[^}]*\}/)?.[0] ?? "";

    expect(sidebarNavRule).toMatch(/align-content:\s*start;/);
    expect(sidebarNavRule).not.toMatch(/flex:\s*1\s+1\s+auto;/);
    expect(sidebarFooterRule).toMatch(/margin-top:\s*auto;/);
  });

  it("centers the login footer credit and keeps it readable", () => {
    const loginView = readFileSync(resolve(sourceRoot, "views", "LoginView.vue"), "utf8");
    const footerRule = loginView.match(/\.login-card__footer\s*\{[^}]*\}/)?.[0] ?? "";

    expect(footerRule).toMatch(/text-align:\s*center;/);
    expect(footerRule).toMatch(/font-size:\s*13px;/);
  });

  it("makes footer author links visibly clickable", () => {
    const css = readFileSync(stylesPath, "utf8");
    const loginView = readFileSync(resolve(sourceRoot, "views", "LoginView.vue"), "utf8");
    const sidebarLinkRule = css.match(/\.sidebar__footer a\s*\{[^}]*\}/)?.[0] ?? "";
    const loginLinkRule = loginView.match(/\.login-card__footer a\s*\{[^}]*\}/)?.[0] ?? "";

    expect(sidebarLinkRule).toMatch(/color:\s*var\(--accent-strong\);/);
    expect(sidebarLinkRule).toMatch(/font-weight:\s*700;/);
    expect(sidebarLinkRule).toMatch(/text-decoration-line:\s*underline;/);
    expect(sidebarLinkRule).toMatch(/cursor:\s*pointer;/);
    expect(loginLinkRule).toMatch(/color:\s*var\(--accent-strong\);/);
    expect(loginLinkRule).toMatch(/font-weight:\s*700;/);
    expect(loginLinkRule).toMatch(/text-decoration-line:\s*underline;/);
    expect(loginLinkRule).toMatch(/cursor:\s*pointer;/);
  });

  it("keeps modal backdrops above the full app shell and routes backdrop clicks through guarded close handlers", () => {
    const css = readFileSync(stylesPath, "utf8");
    const vueSource = listSourceFiles(sourceRoot).map((path) => readFileSync(path, "utf8")).join("\n");
    const assignmentDetail = readFileSync(resolve(sourceRoot, "views", "AssignmentDetailView.vue"), "utf8");

    expect(css).toMatch(/\.copy-dialog-backdrop\s*\{[\s\S]*?inset:\s*0;[\s\S]*?width:\s*100vw;[\s\S]*?height:\s*100vh;/);
    expect(css).toMatch(/\.copy-dialog\s*\{[\s\S]*?background:\s*var\(--modal-surface\);/);
    expect(vueSource).not.toMatch(/@click\.self="[^"]+\s*=\s*false"/);
    expect(assignmentDetail).toContain('@click.self="closeEditDialog"');
  });

  it("keeps copy dialog headers visually separated from the first body block", () => {
    const css = readFileSync(stylesPath, "utf8");
    const headerRule = css.match(/\.copy-dialog__header\s*\{[^}]*\}/)?.[0] ?? "";

    expect(headerRule).toMatch(/padding-bottom:\s*1[0-9]px;/);
    expect(headerRule).toMatch(/border-bottom:\s*1px solid var\(--border-soft\);/);
    expect(headerRule).toMatch(/margin-bottom:\s*1[2-8]px;/);
  });

  it("keeps confirmation dialogs above ordinary edit dialogs", () => {
    const confirmDialog = readFileSync(resolve(sourceRoot, "components", "ConfirmDialog.vue"), "utf8");

    expect(confirmDialog).toContain('@click.self="handleCancel"');
    expect(confirmDialog).toMatch(/\.copy-dialog-backdrop\s*\{[\s\S]*?z-index:\s*5200;/);
  });

  it("keeps assignment review status controls compact", () => {
    const assignmentDetail = readFileSync(resolve(sourceRoot, "views", "AssignmentDetailView.vue"), "utf8");

    expect(assignmentDetail).toMatch(/\.assignment-review-drawer__status-field\s*\{[\s\S]*?flex:\s*0 0 220px;/);
    expect(assignmentDetail).toMatch(/\.assignment-review-drawer__status-field\s+\.copy-dialog__search\s*\{[\s\S]*?width:\s*100%;/);
  });

  it("defines dark native controls and warning feedback tones", () => {
    const css = readFileSync(stylesPath, "utf8");
    const toastStack = readFileSync(resolve(sourceRoot, "components", "ToastStack.vue"), "utf8");
    const statusPillRule = css.match(/\.status-pill\s*\{[^}]*\}/)?.[0] ?? "";

    expect(css).toMatch(/\.app-datetime-input\s*\{[\s\S]*?color-scheme:\s*light;/);
    expect(css).toMatch(/:root\.dark\s+\.app-datetime-input\s*\{[\s\S]*?color-scheme:\s*dark;/);
    expect(css).toMatch(/\.classdrive-date-picker\.el-popper\s*\{[\s\S]*?z-index:\s*5100\s*!important;/);
    expect(css).toMatch(/\.classdrive-date-picker\s+\.el-picker-panel\s*\{[\s\S]*?font-size:\s*16px;/);
    expect(css).toMatch(/\.classdrive-date-picker\s+\.el-date-picker__time-header[\s\S]*?font-weight:\s*700;/);
    expect(css).toMatch(/\.classdrive-date-picker\s+\.el-date-table\s+th,\s*\.classdrive-date-picker\s+\.el-date-table\s+td\s*\{[\s\S]*?font-size:\s*16px;/);
    expect(css).toMatch(/\.classdrive-date-picker\s+\.el-time-spinner__item\s*\{[\s\S]*?font-size:\s*16px;[\s\S]*?font-weight:\s*650;/);
    expect(css).toMatch(/:root\.dark\s+\.classdrive-date-picker\.el-popper[\s\S]*?background:\s*var\(--popover-bg\);/);
    expect(css).toMatch(/\.students-page__file-input::file-selector-button\s*\{/);
    expect(css).toMatch(/:root\.dark\s+\.students-page__file-input::file-selector-button\s*\{/);
    expect(toastStack).toMatch(/\.toast--warning\s*\{/);
    expect(css).toMatch(/\.status-pill--warning\s*\{/);
    expect(statusPillRule).toMatch(/width:\s*fit-content;/);
    expect(statusPillRule).toMatch(/white-space:\s*nowrap;/);
    expect(statusPillRule).toMatch(/flex:\s*0 0 auto;/);
  });

  it("keeps dark date pickers, number steppers, and modal scrollbars legible", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toMatch(/:root\.dark\s*\{[\s\S]*?--scrollbar-track:\s*rgba\(8,\s*16,\s*30,\s*0\.45\);[\s\S]*?--scrollbar-thumb:\s*rgba\(148,\s*197,\s*253,\s*0\.36\);/);
    expect(css).toMatch(/:root\.dark\s+\.classdrive-date-picker\s+\.el-picker-panel__body-wrapper\s*\{[\s\S]*?background:\s*var\(--popover-bg\);/);
    expect(css).toMatch(/:root\.dark\s+\.classdrive-date-picker\s+\.el-date-table\s+td\.prev-month,\s*:root\.dark\s+\.classdrive-date-picker\s+\.el-date-table\s+td\.next-month\s*\{[\s\S]*?color:\s*rgba\(171,\s*188,\s*212,\s*0\.44\);/);
    expect(css).toMatch(/:root\.dark\s+\.classdrive-date-picker\s+\.el-date-picker__time-header\s+\.el-input__wrapper\s*\{[\s\S]*?background:\s*var\(--control-bg\);/);
    expect(css).toMatch(/:root\.dark\s+\.copy-dialog__search\[type="number"\]\s*\{[\s\S]*?color-scheme:\s*dark;/);
    expect(css).toMatch(/:root\.dark\s+\.copy-dialog__search\[type="number"\]::-webkit-inner-spin-button,\s*:root\.dark\s+\.copy-dialog__search\[type="number"\]::-webkit-outer-spin-button\s*\{[\s\S]*?filter:\s*invert\(1\)\s+brightness\(1\.35\);/);
    expect(css).toMatch(/:root\.dark\s+\*::-webkit-scrollbar-thumb\s*\{[\s\S]*?background-color:\s*var\(--scrollbar-thumb\);/);
    expect(css).toMatch(/:root\.dark\s+\.copy-dialog::-webkit-scrollbar-thumb\s*\{[\s\S]*?background-color:\s*var\(--scrollbar-thumb-strong\);/);
  });

  it("uses Chinese Element Plus locale for date pickers", () => {
    const app = readFileSync(resolve(sourceRoot, "App.vue"), "utf8");

    expect(app).toContain("ElConfigProvider");
    expect(app).toContain("zhCn");
    expect(app).toContain(':locale="zhCn"');
    const main = readFileSync(resolve(sourceRoot, "main.ts"), "utf8");
    expect(main).toContain('import "dayjs/locale/zh-cn"');
    expect(main).toContain('dayjs.locale("zh-cn")');
  });

  it("keeps workspace surfaces neutral in light mode and lifted in dark mode", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toMatch(/--bg-canvas:\s*#f7f9fd;/);
    expect(css).toMatch(/--bg-surface:\s*rgba\(255,\s*255,\s*255,\s*0\.97\);/);
    expect(css).toMatch(/--bg-subtle:\s*rgba\(246,\s*248,\s*252,\s*0\.98\);/);
    expect(css).toMatch(/\.files-toolbar\s*\{[\s\S]*?background:\s*var\(--bg-surface\);[\s\S]*?border:\s*1px solid var\(--border-soft\);/);
    expect(readFileSync(resolve(sourceRoot, "views", "StudentFilesView.vue"), "utf8")).toMatch(/\.student-files-page__workspace\s*>\s*\.files-toolbar\s*\{[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;/);
    expect(css).toMatch(/:root\.dark\s*\{[\s\S]*?--bg-canvas:\s*#1b2738;[\s\S]*?--bg-surface:\s*rgba\(34,\s*45,\s*63,\s*0\.96\);[\s\S]*?--modal-surface:\s*#243047;/);
    expect(css).toMatch(/:root\.dark\s+body\s*\{[\s\S]*?linear-gradient\(180deg,\s*#24334a 0%,\s*var\(--bg-canvas\) 34%,\s*#192334 100%\);/);
  });

  it("keeps sticky topbars flush to the page top without a masking layer", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toMatch(/\.shell__content\s*\{[\s\S]*?padding:\s*0 1\.2rem 1\.1rem 0;/);
    expect(css).toMatch(/\.topbar\s*\{[\s\S]*?top:\s*0;[\s\S]*?border-radius:\s*0 0 22px 22px;/);
    expect(css).not.toContain(".topbar::before");
  });

  it("keeps teacher pages and dialogs contained on narrow viewports", () => {
    const css = readFileSync(stylesPath, "utf8");
    const classesView = readFileSync(resolve(sourceRoot, "views", "ClassesView.vue"), "utf8");
    const assignmentsView = readFileSync(resolve(sourceRoot, "views", "AssignmentsView.vue"), "utf8");

    const narrowTopbarRule = css.match(/@media\s*\(max-width:\s*960px\)\s*\{[\s\S]*?@media\s*\(max-width:\s*640px\)/)?.[0] ?? "";
    expect(narrowTopbarRule).toMatch(/\.topbar\s*\{[\s\S]*?display:\s*flex;/);
    expect(narrowTopbarRule).toMatch(/\.topbar__actions\s*\{[\s\S]*?display:\s*flex;/);
    expect(narrowTopbarRule).not.toMatch(/\.topbar\s*\{[\s\S]*?grid-template-columns:/);
    expect(narrowTopbarRule).not.toMatch(/\.topbar__actions\s*\{[\s\S]*?grid-template-columns:/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.copy-dialog-backdrop\s*\{[\s\S]*?place-items:\s*stretch;/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.copy-dialog\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-height:\s*calc\(100dvh - 16px\);/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.classes-page__board,\s*\.settings-page__panel\s*\{[\s\S]*?min-width:\s*0;/);
    expect(classesView).toMatch(/\.classes-management__table-wrap\s*\{[\s\S]*?overflow-x:\s*auto;/);
    const classesNarrowRule = classesView.match(/@media\s*\(max-width:\s*960px\)\s*\{[\s\S]*?@media\s*\(max-width:\s*720px\)/)?.[0] ?? "";
    expect(classesNarrowRule).toMatch(/\.classes-management__filters\s*\{[\s\S]*?flex-wrap:\s*nowrap;/);
    expect(classesNarrowRule).toMatch(/\.classes-management__filters\s*\{[\s\S]*?overflow-x:\s*auto;/);
    expect(classesNarrowRule).toMatch(/\.classes-management__search-group\s*\{[\s\S]*?flex:\s*0 0 310px;/);
    expect(classesNarrowRule).not.toContain("flex-basis: 100%;");
    expect(classesNarrowRule).toMatch(/\.classes-management__table\s*\{[\s\S]*?min-width:\s*840px;/);
    expect(classesNarrowRule).toMatch(/\.classes-management__actions\s*\{[\s\S]*?flex-wrap:\s*nowrap;/);
    const assignmentsNarrowRule = assignmentsView.match(/@media\s*\(max-width:\s*960px\)\s*\{[\s\S]*?@media\s*\(max-width:\s*640px\)/)?.[0] ?? "";
    expect(assignmentsView).toMatch(/\.assignments-page__toolbar\s*\{[\s\S]*?flex-wrap:\s*wrap;/);
    expect(assignmentsNarrowRule).toMatch(/\.assignments-page__toolbar\s*\{[\s\S]*?align-items:\s*center;/);
    expect(assignmentsNarrowRule).toMatch(/\.assignments-page__toolbar\s*:deep\(\.filter-select\)\s*\{[\s\S]*?flex:\s*0 0 180px;/);
    expect(assignmentsNarrowRule).not.toContain("flex-basis: 100%;");
    expect(assignmentsNarrowRule).toMatch(/\.assignments-page__search-group\s*\{[\s\S]*?flex:\s*1 1 220px;/);
    expect(assignmentsView).toMatch(/\.assignments-page__table th:nth-child\(3\),\s*\.assignments-page__table td:nth-child\(3\),\s*\.assignments-page__table th:nth-child\(4\),\s*\.assignments-page__table td:nth-child\(4\)\s*\{[\s\S]*?white-space:\s*nowrap;/);
    expect(assignmentsView).toMatch(/\.assignments-page__table \.table-sort-button\s*\{[\s\S]*?white-space:\s*nowrap;/);
    expect(assignmentsView).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.assignments-page__dialog\s*\{[\s\S]*?width:\s*100%;/);
    expect(assignmentsView).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.assignments-page__inline-field,\s*\.assignments-page__inline-field--datetime\s*\{[\s\S]*?min-width:\s*0;/);
  });

  it("keeps paginated audit and stats tables stable when a page has only a few rows", () => {
    const auditLogsView = readFileSync(resolve(sourceRoot, "views", "AuditLogsView.vue"), "utf8");
    const assignmentsView = readFileSync(resolve(sourceRoot, "views", "AssignmentsView.vue"), "utf8");
    const assignmentDetail = readFileSync(resolve(sourceRoot, "views", "AssignmentDetailView.vue"), "utf8");

    expect(auditLogsView).toContain("auditLogTableFrameStyle");
    expect(auditLogsView).toContain("audit-logs-page__table-frame");
    expect(auditLogsView).toMatch(/\.audit-logs-page__table-frame\s*\{[\s\S]*?min-height:\s*calc\(44px \* \(var\(--audit-log-page-size\) \+ 1\)\);/);
    expect(auditLogsView).toMatch(/\.audit-logs-page__table thead tr,\s*\.audit-logs-page__table tbody tr\s*\{[\s\S]*?height:\s*44px;/);

    expect(assignmentsView).toContain("missingStatsTableFrameStyle");
    expect(assignmentsView).toContain("assignments-page__stats-table-frame");
    expect(assignmentsView).toMatch(/\.assignments-page__stats-table-frame\s*\{[\s\S]*?min-height:\s*calc\(44px \* \(var\(--missing-stats-page-size\) \+ 1\)\);/);
    expect(assignmentsView).toMatch(/\.assignments-page__stats-table thead tr,\s*\.assignments-page__stats-table tbody tr\s*\{[\s\S]*?height:\s*44px;/);

    expect(assignmentDetail).toContain("assignmentMissingStatsTableFrameStyle");
    expect(assignmentDetail).toContain("assignment-missing-dialog__table-frame");
    expect(assignmentDetail).toMatch(/\.assignment-missing-dialog__table-frame\s*\{[\s\S]*?min-height:\s*calc\(44px \* \(var\(--assignment-missing-page-size\) \+ 1\)\);/);
    expect(assignmentDetail).toMatch(/\.assignment-missing-dialog__table thead tr,\s*\.assignment-missing-dialog__table tbody tr\s*\{[\s\S]*?height:\s*44px;/);
  });

  it("keeps preview and drawer surfaces opaque and themed in dark mode", () => {
    const css = readFileSync(stylesPath, "utf8");
    const assignmentDetail = readFileSync(resolve(sourceRoot, "views", "AssignmentDetailView.vue"), "utf8");
    const previewDialog = readFileSync(resolve(sourceRoot, "components", "FilePreviewDialog.vue"), "utf8");

    expect(css).toMatch(/--modal-surface:\s*#ffffff;/);
    expect(css).toMatch(/:root\.dark\s*\{[\s\S]*?--modal-surface:\s*#243047;/);
    expect(previewDialog).toMatch(/\.preview-dialog\s*\{[\s\S]*?background:\s*var\(--modal-surface\);/);
    expect(assignmentDetail).toMatch(/:global\(:root\.dark\s+\.assignment-review-drawer\.el-drawer\)\s*\{/);
    expect(assignmentDetail).toMatch(/--review-drawer-bg:\s*#243047;/);
    expect(assignmentDetail).toMatch(/--review-panel-bg:\s*#2d3d56;/);
  });

  it("fits image previews inside the dialog without cropping their outline", () => {
    const previewDialog = readFileSync(resolve(sourceRoot, "components", "FilePreviewDialog.vue"), "utf8");

    expect(previewDialog).toContain("preview-dialog__body--image");
    expect(previewDialog).toMatch(/\.preview-dialog__body--image\s*\{[\s\S]*?display:\s*grid;[\s\S]*?place-items:\s*center;[\s\S]*?overflow:\s*hidden;/);
    expect(previewDialog).toMatch(/\.preview-dialog__image\s*\{[\s\S]*?max-width:\s*100%;[\s\S]*?max-height:\s*calc\(100vh - 180px\);[\s\S]*?object-fit:\s*contain;/);
    expect(previewDialog).not.toMatch(/\.preview-dialog__image\s*\{[\s\S]*?object-fit:\s*cover;/);
  });

  it("uses non-editable Element Plus pickers for every date-time setting", () => {
    const vueSource = listSourceFiles(sourceRoot).map((path) => readFileSync(path, "utf8")).join("\n");

    expect(vueSource).not.toContain('type="datetime-local"');
    expect(vueSource).not.toContain('type="date"');
    expect(vueSource).not.toContain('type="time"');
    expect(vueSource).toContain("<ElDatePicker");
    expect(vueSource).toContain(':editable="false"');
    expect(vueSource).toContain('data-testid="assignment-create-due-at"');
    expect(vueSource).toContain('data-testid="assignment-edit-due-at"');
  });
});
