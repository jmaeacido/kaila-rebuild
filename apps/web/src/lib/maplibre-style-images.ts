import type { Map, MapStyleImageMissingEvent } from "maplibre-gl";

const transparentPixel = new Uint8Array([0, 0, 0, 0]);

export function addMissingStyleImageFallback(map: Map): () => void {
  const addFallback = ({ id }: MapStyleImageMissingEvent) => {
    if (!map.hasImage(id)) {
      map.addImage(id, {
        width: 1,
        height: 1,
        data: transparentPixel,
      });
    }
  };

  map.on("styleimagemissing", addFallback);

  return () => map.off("styleimagemissing", addFallback);
}
