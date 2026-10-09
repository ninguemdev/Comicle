import { useEffect, useRef, useState } from 'react';

import { strings } from '../../strings/pt-BR';
import { Button } from '../../ui/button';
import { DrawingEditor, type DrawingEditorHandle } from './drawing-editor';
import { loadImage } from './load-image';

const texts = strings.devEditor;

interface ExportedPng {
  url: string;
  bytes: number;
  width: number;
  height: number;
}

function pngUrl(png: Uint8Array): string {
  return URL.createObjectURL(new Blob([new Uint8Array(png)], { type: 'image/png' }));
}

async function describePng(png: Uint8Array): Promise<ExportedPng> {
  const url = pngUrl(png);
  const image = await loadImage(url);
  return { url, bytes: png.byteLength, width: image.naturalWidth, height: image.naturalHeight };
}

/** The editor alone, routed only in development (`/dev/editor`). */
export function DevEditorPage() {
  const editor = useRef<DrawingEditorHandle>(null);
  const [disabled, setDisabled] = useState(false);
  const [revision, setRevision] = useState(0);
  const [exported, setExported] = useState<ExportedPng | null | undefined>(undefined);
  const [baseImageUrl, setBaseImageUrl] = useState<string | undefined>(undefined);
  /** Remounting the editor is how the base image is tried, as after a reconnection (R48). */
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    return () => {
      if (exported) {
        URL.revokeObjectURL(exported.url);
      }
    };
  }, [exported]);

  async function exportPanel(): Promise<void> {
    const png = await editor.current?.exportPng();
    setExported(png ? await describePng(png) : null);
  }

  async function loadAsBase(): Promise<void> {
    const png = await editor.current?.exportPng();
    if (png) {
      setBaseImageUrl(pngUrl(png));
      setEditorKey((key) => key + 1);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 p-4">
      <header>
        <h1 className="font-display text-4xl tracking-wide">{texts.title}</h1>
        <p className="text-muted">{texts.intro}</p>
      </header>
      <div className="h-[70dvh] min-h-80">
        <DrawingEditor
          key={editorKey}
          ref={editor}
          disabled={disabled}
          baseImageUrl={baseImageUrl}
          onChange={setRevision}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void exportPanel()}>{texts.export}</Button>
        <Button variant="secondary" onClick={() => void loadAsBase()}>
          {texts.useAsBase}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setDisabled((value) => !value);
          }}
        >
          {disabled ? texts.enable : texts.disable}
        </Button>
        <span className="text-muted">{texts.revision(revision)}</span>
      </div>
      {exported === null && <p>{texts.empty}</p>}
      {exported && (
        <figure className="flex flex-col gap-2">
          <img
            src={exported.url}
            alt={texts.preview}
            className="w-full max-w-md rounded-md border-comic"
          />
          <figcaption>{texts.exported(exported.width, exported.height, exported.bytes)}</figcaption>
        </figure>
      )}
    </main>
  );
}
