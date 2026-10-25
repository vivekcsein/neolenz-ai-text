import type {
  NeolenzAnalysis,
  NeolenzModelOutput,
} from "@/packages/schemas/neolenz.schema";

const MIN_BOX_SIZE = 0.01;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const clean = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

/**
 * Turns the model's lenient output into the strict `NeolenzAnalysis`.
 * Anything unusable (empty values, duplicate ids, degenerate boxes) is
 * dropped. Nothing is ever invented to fill a gap.
 */
export const sanitizeAnalysis = (raw: NeolenzModelOutput): NeolenzAnalysis => {
  const seen = new Set<string>();

  const regions = raw.regions.flatMap((region) => {
    const id = region.id.trim();
    const label = region.label.trim();
    const { x, y, width, height } = region.box;

    if (!id || !label || seen.has(id)) return [];
    if (![x, y, width, height].every(Number.isFinite)) return [];

    const left = clamp01(x);
    const top = clamp01(y);
    const boxWidth = Math.min(width, 1 - left);
    const boxHeight = Math.min(height, 1 - top);

    if (boxWidth < MIN_BOX_SIZE || boxHeight < MIN_BOX_SIZE) return [];

    seen.add(id);
    return [
      {
        id,
        kind: region.kind,
        label,
        box: { x: left, y: top, width: boxWidth, height: boxHeight },
      },
    ];
  });

  const regionIds = new Set(regions.map((region) => region.id));
  const linkRegion = (id: string | undefined) =>
    id && regionIds.has(id) ? id : undefined;

  const fields = raw.fields.flatMap((field) => {
    const label = field.label.trim();
    const value = field.value.trim();
    if (!label || !value) return [];
    return [
      {
        label,
        value,
        kind: field.kind,
        regionId: linkRegion(field.regionId),
      },
    ];
  });

  const tables = raw.tables.flatMap((table) => {
    const headers = table.headers.map((header) => header.trim());
    const rows = table.rows.filter((row) => row.some((cell) => cell.trim()));
    if (headers.length === 0 && rows.length === 0) return [];
    return [{ title: clean(table.title), headers, rows }];
  });

  const objects = raw.objects.flatMap((object) => {
    const name = object.name.trim();
    if (!name) return [];
    return [
      {
        name,
        description: clean(object.description),
        regionId: linkRegion(object.regionId),
      },
    ];
  });

  return {
    text: raw.text.trim(),
    title: clean(raw.title),
    documentType: clean(raw.documentType),
    mainSubject: clean(raw.mainSubject),
    summary: clean(raw.summary),
    fields,
    tables,
    objects,
    regions,
  };
};
