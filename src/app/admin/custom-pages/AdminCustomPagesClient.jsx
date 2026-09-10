'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  Code2,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
  Type,
  Wand2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SettingSection } from '@/app/admin/settings/settingsShared';
import { DEFAULT_CUSTOM_PAGES, normalizeCustomPageSlug } from '@/lib/customPages';
import { cn } from '@/lib/utils';

const NON_CUSTOM_PAGE_SLUGS = new Set(['auth', 'deals', 'orders', 'products', 'settings', 'signin', 'wishlist']);

const HTML_SNIPPETS = [
  { label: 'H2 Heading', snippet: '<h2>Section Title</h2>\n' },
  { label: 'H3 Subheading', snippet: '<h3>Subsection Title</h3>\n' },
  { label: 'Paragraph', snippet: '<p>Write your detailed text here...</p>\n' },
  { label: 'Bold', snippet: '<strong>Bold text</strong>' },
  { label: 'List', snippet: '<ul>\n  <li>Key point 1</li>\n  <li>Key point 2</li>\n</ul>\n' },
  { label: 'Link', snippet: '<a href="https://wa.me/" class="text-primary underline font-medium">WhatsApp Link</a>' },
  { label: 'Callout Box', snippet: '<div class="p-4 rounded-xl bg-primary/10 border border-primary/20 text-foreground">\n  <strong>Note:</strong> Important announcement or message here.\n</div>\n' },
  { label: 'Table', snippet: '<table class="w-full border-collapse my-4">\n  <thead>\n    <tr>\n      <th class="border border-border p-2.5 bg-muted/40 text-left font-semibold">Header 1</th>\n      <th class="border border-border p-2.5 bg-muted/40 text-left font-semibold">Header 2</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td class="border border-border p-2.5">Row 1 Cell 1</td>\n      <td class="border border-border p-2.5">Row 1 Cell 2</td>\n    </tr>\n  </tbody>\n</table>\n' },
  { label: 'Image', snippet: '<img src="https://..." alt="Custom image" class="w-full rounded-2xl my-4" />\n' },
];

function makeNewPage(pages = []) {
  const nextNumber = pages.length + 1;
  const slug = `custom-page-${nextNumber}`;

  return {
    slug,
    title: `Custom Page ${nextNumber}`,
    label: `Custom Page ${nextNumber}`,
    description: '',
    content: '',
    seoTitle: '',
    seoDescription: '',
    isEnabled: true,
    showInFooter: true,
    sortOrder: pages.length,
  };
}

function getPageMeta(page) {
  const isDefaultPage = DEFAULT_CUSTOM_PAGES.some((defaultPage) => defaultPage.slug === page.slug);
  return {
    isDefaultPage,
    href: `/${page.slug}`,
    isEnabled: page.isEnabled !== false,
    showInFooter: page.showInFooter !== false,
  };
}

export default function AdminCustomPagesClient({ initialPages }) {
  const [pages, setPages] = useState(Array.isArray(initialPages) ? initialPages : []);
  const [selectedSlug, setSelectedSlug] = useState(initialPages?.[0]?.slug || '');
  const [editorMode, setEditorMode] = useState('html');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!pages.some((page) => page.slug === selectedSlug)) {
      setSelectedSlug(pages[0]?.slug || '');
    }
  }, [pages, selectedSlug]);

  const selectedIndex = Math.max(0, pages.findIndex((page) => page.slug === selectedSlug));
  const selectedPage = pages[selectedIndex] || null;
  const livePageCount = useMemo(() => pages.filter((page) => page.isEnabled !== false).length, [pages]);
  const footerPageCount = useMemo(() => pages.filter((page) => page.showInFooter !== false).length, [pages]);

  function updatePage(index, field, value) {
    setPages((current) =>
      current.map((page, pageIndex) =>
        pageIndex === index
          ? {
              ...page,
              [field]: value,
            }
          : page
      )
    );
    setSaved(false);
  }

  function movePage(index, direction) {
    setPages((current) => {
      const next = [...current];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return current;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next.map((page, pageIndex) => ({ ...page, sortOrder: pageIndex }));
    });
    setSaved(false);
  }

  function removePage(index) {
    const slug = pages[index]?.slug;
    if (DEFAULT_CUSTOM_PAGES.some((page) => page.slug === slug)) {
      toast.error('Default pages cannot be removed. Disable them instead.');
      return;
    }

    setPages((current) =>
      current
        .filter((_, pageIndex) => pageIndex !== index)
        .map((page, pageIndex) => ({ ...page, sortOrder: pageIndex }))
    );
    setSaved(false);
  }

  function insertSnippet(snippet) {
    const currentContent = selectedPage?.content || '';
    const textarea = document.getElementById(`custom-page-content-editor-${selectedIndex}`);
    if (!textarea) {
      updatePage(selectedIndex, 'content', currentContent + '\n' + snippet);
      return;
    }
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const nextContent = currentContent.slice(0, start) + snippet + currentContent.slice(end);
    updatePage(selectedIndex, 'content', nextContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 50);
  }

  function convertPlainToHtml() {
    const current = (selectedPage?.content || '').trim();
    if (!current) return;
    if (/<[a-z][\s\S]*>/i.test(current)) {
      toast.info('Content already contains HTML tags.');
      return;
    }
    const blocks = current.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
    const htmlBlocks = blocks.map((block) => {
      const looksLikeHeading = block.length < 90 && !block.endsWith('.');
      if (looksLikeHeading) {
        return `<h2>${block}</h2>`;
      }
      return `<p>${block}</p>`;
    });
    updatePage(selectedIndex, 'content', htmlBlocks.join('\n\n'));
    setEditorMode('html');
    toast.success('Converted text to HTML structure.');
  }

  function addPage() {
    const nextPage = makeNewPage(pages);
    setPages((current) => [...current, nextPage]);
    setSelectedSlug(nextPage.slug);
    setSaved(false);
  }

  async function handleSave() {
    const normalizedPages = pages.map((page, index) => ({
      ...page,
      slug: normalizeCustomPageSlug(page.slug || page.title || `custom-page-${index + 1}`),
      title: String(page.title || '').trim(),
      label: String(page.label || page.title || '').trim(),
      description: String(page.description || '').trim(),
      content: String(page.content || '').trim(),
      seoTitle: String(page.seoTitle || '').trim(),
      seoDescription: String(page.seoDescription || '').trim(),
      sortOrder: index,
    }));

    if (normalizedPages.some((page) => !page.slug || !page.title)) {
      toast.error('Each custom page needs at least a slug and title.');
      return;
    }

    const slugSet = new Set();
    for (const page of normalizedPages) {
      if (slugSet.has(page.slug)) {
        toast.error(`Duplicate slug detected: ${page.slug}`);
        return;
      }
      if (NON_CUSTOM_PAGE_SLUGS.has(page.slug) && !DEFAULT_CUSTOM_PAGES.some((defaultPage) => defaultPage.slug === page.slug)) {
        toast.error(`The slug "${page.slug}" is reserved by the storefront.`);
        return;
      }
      slugSet.add(page.slug);
    }

    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customPages: normalizedPages }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to save custom pages');
      }

      const nextPages = Array.isArray(data.data?.customPages) ? data.data.customPages : normalizedPages;
      setPages(nextPages);
      setSelectedSlug((current) => nextPages.some((page) => page.slug === current) ? current : nextPages[0]?.slug || '');
      setSaved(true);
      toast.success('Custom pages updated successfully.');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      toast.error(error.message || 'Failed to save custom pages.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full pb-10 md:pb-0 space-y-6">
      <div className="surface-card rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-border">
        <div className="max-w-md">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-2">
            Content Management
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Custom Pages</h2>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            Edit policy and information pages in the same clean admin style without touching code.
          </p>
        </div>
        <div className="shrink-0 flex items-center justify-center">
          <Image
            src="/undraw_website-setup_o2zf.svg"
            alt="Custom Pages Setup"
            width={160}
            height={130}
            className="h-auto w-[130px] sm:w-[150px] object-contain select-none opacity-95"
            priority
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            {livePageCount} live
          </Badge>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            {footerPageCount} in footer
          </Badge>
          <Button type="button" size="sm" className="admin-cta-button w-full sm:w-auto" onClick={addPage}>
            <Plus data-icon="inline-start" />
            Add Custom Page
          </Button>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="surface-card rounded-2xl p-12 text-center">
          <p className="font-medium text-muted-foreground">No custom pages yet. Add your first page to begin.</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="surface-card rounded-2xl p-4 md:p-5">
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground">Page List</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Select a page to edit its content and storefront visibility.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {pages.map((page, index) => {
                const meta = getPageMeta(page);
                const isSelected = selectedPage?.slug === page.slug;

                return (
                  <button
                    key={`${page.slug}-${index}`}
                    type="button"
                    onClick={() => setSelectedSlug(page.slug)}
                    className={cn(
                      'flex w-full flex-col gap-2 rounded-xl border px-3 py-3 text-left transition-colors',
                      isSelected
                        ? 'border-border bg-muted/60'
                        : 'border-border/60 bg-background hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {page.title || `Page ${index + 1}`}
                      </p>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
                          meta.isEnabled ? 'bg-muted text-foreground' : 'bg-muted/60 text-muted-foreground'
                        )}
                      >
                        {meta.isEnabled ? 'Live' : 'Hidden'}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">/{page.slug}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {meta.isDefaultPage ? <Badge variant="secondary" className="rounded-full">Default</Badge> : null}
                      {meta.showInFooter ? <Badge variant="secondary" className="rounded-full">Footer</Badge> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="space-y-6">
            {selectedPage ? (
              <SettingSection
                icon={FileText}
                title={selectedPage.title || `Page ${selectedIndex + 1}`}
                description="Edit the selected page details, content, and SEO settings."
              >
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Page Path</p>
                    <p className="mt-1 truncate text-sm font-semibold text-foreground">/{selectedPage.slug}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="admin-cta-button"
                      onClick={() => movePage(selectedIndex, -1)}
                      disabled={selectedIndex === 0}
                    >
                      <ArrowUp data-icon="inline-start" />
                      Up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="admin-cta-button"
                      onClick={() => movePage(selectedIndex, 1)}
                      disabled={selectedIndex === pages.length - 1}
                    >
                      <ArrowDown data-icon="inline-start" />
                      Down
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="admin-cta-button"
                      render={<Link href={`/${selectedPage.slug}`} target="_blank" />}
                      nativeButton={false}
                    >
                      <ExternalLink data-icon="inline-start" />
                      Preview
                    </Button>
                    {!getPageMeta(selectedPage).isDefaultPage ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="admin-cta-button text-destructive hover:text-destructive"
                        onClick={() => removePage(selectedIndex)}
                      >
                        <Trash2 data-icon="inline-start" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>

                <FieldGroup className="grid gap-4 lg:grid-cols-2">
                  <Field>
                    <FieldLabel>Page Slug</FieldLabel>
                    <FieldContent>
                      <Input
                        value={selectedPage.slug}
                        onChange={(event) => updatePage(selectedIndex, 'slug', normalizeCustomPageSlug(event.target.value))}
                        placeholder="about-us"
                      />
                      <FieldDescription>Used in the page URL, for example `/about-us`.</FieldDescription>
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>Page Title</FieldLabel>
                    <Input
                      value={selectedPage.title}
                      onChange={(event) => updatePage(selectedIndex, 'title', event.target.value)}
                      placeholder="About Us"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Menu Label</FieldLabel>
                    <FieldContent>
                      <Input
                        value={selectedPage.label}
                        onChange={(event) => updatePage(selectedIndex, 'label', event.target.value)}
                        placeholder="About Us"
                      />
                      <FieldDescription>Shown in the storefront footer links.</FieldDescription>
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>Short Description</FieldLabel>
                    <Input
                      value={selectedPage.description}
                      onChange={(event) => updatePage(selectedIndex, 'description', event.target.value)}
                      placeholder="A short introduction for this page"
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup>
                  <Field>
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between mb-2">
                      <div>
                        <FieldLabel className="text-sm font-semibold">Page Content</FieldLabel>
                        <FieldDescription className="text-xs">Write custom text, full HTML markup, or preview live.</FieldDescription>
                      </div>

                      {/* Mode Toggle */}
                      <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1 gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditorMode('html')}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                            editorMode === 'html'
                              ? 'bg-background text-foreground shadow-xs border border-border/60'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Code2 className="size-3.5 text-primary" />
                          HTML Code
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorMode('text')}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                            editorMode === 'text'
                              ? 'bg-background text-foreground shadow-xs border border-border/60'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Type className="size-3.5" />
                          Plain Text
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorMode('preview')}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                            editorMode === 'preview'
                              ? 'bg-background text-foreground shadow-xs border border-border/60'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Eye className="size-3.5 text-emerald-600" />
                          Live Preview
                        </button>
                      </div>
                    </div>

                    {/* HTML Quick Snippet Toolbar (Only in HTML mode) */}
                    {editorMode === 'html' && (
                      <div className="mb-2.5 flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-border/80 bg-muted/20">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                          Quick Insert:
                        </span>
                        {HTML_SNIPPETS.map((item, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => insertSnippet(item.snippet)}
                            className="px-2.5 py-1 rounded-md border border-border/60 bg-background text-[11.5px] font-medium text-foreground hover:bg-muted/60 hover:border-border transition-colors cursor-pointer"
                          >
                            {item.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={convertPlainToHtml}
                          className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-md border border-primary/30 bg-primary/10 text-[11.5px] font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                          title="Wrap text paragraphs into <p> and <h2> HTML tags automatically"
                        >
                          <Wand2 className="size-3" />
                          Auto Format HTML
                        </button>
                      </div>
                    )}

                    <FieldContent>
                      {editorMode === 'preview' ? (
                        <div className="min-h-[340px] max-h-[520px] overflow-y-auto rounded-xl border border-border bg-card p-6">
                          <div className="mb-4 pb-3 border-b border-border/60 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Live Storefront Preview ({selectedPage.title || 'Page'})
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">Path: /{selectedPage.slug}</span>
                          </div>
                          {selectedPage.content?.trim() ? (
                            /<[a-z][\s\S]*>/i.test(selectedPage.content) ? (
                              <div
                                className="custom-page-html-content space-y-4 text-[15px] leading-[1.85] text-foreground/85 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:my-3.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_li]:my-1.5 [&_a]:text-primary [&_a]:underline [&_a]:font-medium hover:[&_a]:opacity-85 [&_table]:w-full [&_table]:border-collapse [&_table]:my-6 [&_th]:border [&_th]:border-border [&_th]:p-3 [&_th]:bg-muted/40 [&_th]:font-semibold [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-3 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/60 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:my-4 [&_img]:rounded-xl [&_img]:my-5 [&_img]:max-w-full [&_hr]:my-8 [&_hr]:border-border [&_strong]:font-bold [&_strong]:text-foreground"
                                dangerouslySetInnerHTML={{ __html: selectedPage.content }}
                              />
                            ) : (
                              <div className="space-y-4 text-[15px] leading-[1.85] text-foreground/85">
                                {selectedPage.content.split(/\n{2,}/).map((block, i) => (
                                  <p key={i}>{block}</p>
                                ))}
                              </div>
                            )
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No content entered yet.</p>
                          )}
                        </div>
                      ) : (
                        <Textarea
                          id={`custom-page-content-editor-${selectedIndex}`}
                          rows={14}
                          value={selectedPage.content}
                          onChange={(event) => updatePage(selectedIndex, 'content', event.target.value)}
                          placeholder={
                            editorMode === 'html'
                              ? '<h2>Page Title</h2>\n<p>Write custom HTML here, using any tags, styles, classes, tables, etc...</p>'
                              : 'Write your page content here. Separate paragraphs with a blank line.'
                          }
                          className={cn(
                            'transition-all duration-150',
                            editorMode === 'html'
                              ? 'font-mono text-xs sm:text-sm bg-muted/15 leading-relaxed tracking-tight selection:bg-primary/20'
                              : 'text-sm leading-relaxed'
                          )}
                        />
                      )}
                      <FieldDescription>
                        {editorMode === 'html'
                          ? 'Full HTML supported: you can use <h2>, <p>, <strong>, <ul>, <li>, <a>, <table>, <img>, <div>, custom Tailwind classes, or inline styling.'
                          : 'Use blank lines to create separate content paragraphs, or switch to HTML Code mode for custom layout & styling.'}
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid gap-4 lg:grid-cols-2">
                  <Field>
                    <FieldLabel>SEO Title</FieldLabel>
                    <Input
                      value={selectedPage.seoTitle}
                      onChange={(event) => updatePage(selectedIndex, 'seoTitle', event.target.value)}
                      placeholder="About Us | China Unique Store"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>SEO Description</FieldLabel>
                    <Textarea
                      rows={4}
                      value={selectedPage.seoDescription}
                      onChange={(event) => updatePage(selectedIndex, 'seoDescription', event.target.value)}
                      placeholder="Short search description for this page"
                    />
                  </Field>
                </FieldGroup>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Field orientation="horizontal" className="items-start justify-between rounded-lg border border-border bg-muted/35 px-4 py-3">
                    <FieldContent>
                      <FieldLabel>Page Enabled</FieldLabel>
                      <FieldDescription>Disable a page without deleting its content.</FieldDescription>
                    </FieldContent>
                    <Switch
                      checked={selectedPage.isEnabled !== false}
                      onCheckedChange={(value) => updatePage(selectedIndex, 'isEnabled', value)}
                    />
                  </Field>

                  <Field orientation="horizontal" className="items-start justify-between rounded-lg border border-border bg-muted/35 px-4 py-3">
                    <FieldContent>
                      <FieldLabel>Show In Footer</FieldLabel>
                      <FieldDescription>Include this page in the storefront quick links list.</FieldDescription>
                    </FieldContent>
                    <Switch
                      checked={selectedPage.showInFooter !== false}
                      onCheckedChange={(value) => updatePage(selectedIndex, 'showInFooter', value)}
                    />
                  </Field>
                </div>
              </SettingSection>
            ) : null}

            <div className="flex items-center gap-4 pb-4">
              <Button onClick={handleSave} disabled={saving} size="sm" className="admin-cta-button">
                {saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Custom Pages'}
              </Button>
              {saved ? <span className="text-sm font-medium text-foreground">Custom pages updated successfully.</span> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
