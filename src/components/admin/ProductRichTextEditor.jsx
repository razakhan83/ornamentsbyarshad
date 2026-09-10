"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Underline,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatRichTextDescriptionHtml,
  sanitizeRichTextHtml,
} from "@/lib/richText";
import { cn } from "@/lib/utils";

const toolbarButtonClass =
  "h-9 w-9 rounded-lg border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground";

function ToolbarButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={toolbarButtonClass}
    >
      <Icon className="mx-auto size-4" />
    </button>
  );
}

function getEmbedVideoHtml(url) {
  const trimmedUrl = url.trim();
  const youtubeMatch =
    trimmedUrl.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
    ) || trimmedUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  const vimeoMatch = trimmedUrl.match(/vimeo\.com\/(\d+)/);

  if (youtubeMatch?.[1]) {
    return `<div class="rich-editor-embed"><iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}" title="Embedded video" loading="lazy" allowfullscreen></iframe></div>`;
  }

  if (vimeoMatch?.[1]) {
    return `<div class="rich-editor-embed"><iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" title="Embedded video" loading="lazy" allowfullscreen></iframe></div>`;
  }

  return `<video controls src="${trimmedUrl}" style="max-width:100%;border-radius:16px;"></video>`;
}

export default function ProductRichTextEditor({
  value,
  onChange,
  placeholder = "Write a product description...",
  className,
}) {
  const editorRef = useRef(null);
  const lastEmittedValueRef = useRef("");
  const [mode, setMode] = useState("visual");
  const normalizedValue = formatRichTextDescriptionHtml(value);

  useEffect(() => {
    lastEmittedValueRef.current = normalizedValue;
  }, [normalizedValue]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    document.execCommand("styleWithCSS", false, false);
    document.execCommand("defaultParagraphSeparator", false, "p");
  }, []);

  useEffect(() => {
    if (mode !== "visual" || !editorRef.current) {
      return;
    }

    const isFocused = document.activeElement === editorRef.current;
    const isEditorOwnedUpdate = normalizedValue === lastEmittedValueRef.current;

    if (isFocused && isEditorOwnedUpdate) {
      return;
    }

    if (editorRef.current.innerHTML !== normalizedValue) {
      editorRef.current.innerHTML = normalizedValue;
    }
  }, [mode, normalizedValue]);

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const syncEditorValue = () => {
    if (!editorRef.current) {
      return;
    }

    const sanitizedValue = sanitizeRichTextHtml(editorRef.current.innerHTML);
    lastEmittedValueRef.current = sanitizedValue;
    onChange(sanitizedValue);
  };

  const runCommand = (command, commandValue = null) => {
    focusEditor();
    document.execCommand(command, false, commandValue);
    syncEditorValue();
  };

  const insertLink = () => {
    const url = window.prompt("Enter the link URL");
    if (!url) {
      return;
    }

    runCommand("createLink", url.trim());
  };

  const insertImage = () => {
    const url = window.prompt("Enter the image URL");
    if (!url) {
      return;
    }

    runCommand(
      "insertHTML",
      `<img src="${url.trim()}" alt="" style="max-width:100%;height:auto;border-radius:16px;" />`
    );
  };

  const insertVideo = () => {
    const url = window.prompt(
      "Enter a video URL (YouTube, Vimeo, or direct MP4/WebM)"
    );
    if (!url) {
      return;
    }

    runCommand("insertHTML", getEmbedVideoHtml(url));
  };

  const handleBlur = () => {
    if (!editorRef.current) {
      return;
    }

    const sanitizedValue = sanitizeRichTextHtml(editorRef.current.innerHTML);
    lastEmittedValueRef.current = sanitizedValue;

    if (editorRef.current.innerHTML !== sanitizedValue) {
      editorRef.current.innerHTML = sanitizedValue;
    }

    onChange(sanitizedValue);
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-background shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/35 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <ToolbarButton
            icon={Pilcrow}
            label="Paragraph"
            onClick={() => runCommand("formatBlock", "p")}
          />
          <ToolbarButton
            icon={Heading1}
            label="Heading 1"
            onClick={() => runCommand("formatBlock", "h1")}
          />
          <ToolbarButton
            icon={Heading2}
            label="Heading 2"
            onClick={() => runCommand("formatBlock", "h2")}
          />
        </div>

        <div className="h-7 w-px bg-border" />

        <div className="flex flex-wrap items-center gap-2">
          <ToolbarButton icon={Bold} label="Bold" onClick={() => runCommand("bold")} />
          <ToolbarButton
            icon={Italic}
            label="Italic"
            onClick={() => runCommand("italic")}
          />
          <ToolbarButton
            icon={Underline}
            label="Underline"
            onClick={() => runCommand("underline")}
          />
        </div>

        <div className="h-7 w-px bg-border" />

        <div className="flex flex-wrap items-center gap-2">
          <ToolbarButton
            icon={AlignLeft}
            label="Align Left"
            onClick={() => runCommand("justifyLeft")}
          />
          <ToolbarButton
            icon={AlignCenter}
            label="Align Center"
            onClick={() => runCommand("justifyCenter")}
          />
          <ToolbarButton
            icon={AlignRight}
            label="Align Right"
            onClick={() => runCommand("justifyRight")}
          />
        </div>

        <div className="h-7 w-px bg-border" />

        <div className="flex flex-wrap items-center gap-2">
          <ToolbarButton
            icon={List}
            label="Bulleted List"
            onClick={() => runCommand("insertUnorderedList")}
          />
          <ToolbarButton
            icon={ListOrdered}
            label="Numbered List"
            onClick={() => runCommand("insertOrderedList")}
          />
          <ToolbarButton icon={Link2} label="Insert Link" onClick={insertLink} />
          <ToolbarButton
            icon={ImagePlus}
            label="Insert Image"
            onClick={insertImage}
          />
          <ToolbarButton icon={Video} label="Insert Video" onClick={insertVideo} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "visual" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setMode("visual")}
          >
            Visual
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "html" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setMode("html")}
          >
            <Code2 className="mr-2 size-4" />
            HTML
          </Button>
        </div>
      </div>

      {mode === "visual" ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={syncEditorValue}
          onBlur={handleBlur}
          className="rich-editor min-h-[280px] w-full px-4 py-4 text-sm leading-7 text-foreground outline-none empty:before:pointer-events-none empty:before:block empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_h1]:my-3 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:tracking-tight [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_img]:my-4 [&_img]:max-w-full [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:rounded-2xl [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_video]:my-4 [&_video]:max-w-full"
        />
      ) : (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          className="min-h-[280px] w-full resize-y border-0 bg-background px-4 py-4 font-mono text-sm leading-6 text-foreground outline-none"
          placeholder="<p>Write your product description in HTML...</p>"
        />
      )}

      <div className="border-t border-border bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
        Supports formatted text, alignment, links, image URLs, video embeds, and raw HTML editing.
      </div>
    </div>
  );
}
