import type { DrawingDocument } from './drawing-document';
import { createPanelLayer, type CreateLayer } from './layers';
import { renderDocument } from './renderer';

/**
 * The drawing as an opaque PANEL_WIDTH × PANEL_HEIGHT PNG, whatever the screen size (D4), or
 * `null` when there is nothing to hand in (R40).
 */
export async function exportPng(
  doc: DrawingDocument,
  createLayer: CreateLayer = createPanelLayer,
): Promise<Uint8Array | null> {
  if (doc.isEmpty) {
    return null;
  }
  const layer = createLayer();
  renderDocument(layer.ctx, doc);
  return layer.toPng();
}
