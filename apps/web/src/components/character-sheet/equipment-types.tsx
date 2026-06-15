import {
  armorTooltipLines,
  formatArmorSummary,
  formatConsumableTags,
  formatWeaponSummary,
  parseConsumableProperties,
  type EquipmentSectionKey,
} from '@dcc-web/shared';
import { Tooltip, Typography } from '@mui/material';
import type { CharacterItem } from '../../types/game';

export interface EquipmentItemDraft {
  id: string;
  category: CharacterItem['category'];
  name: string;
  quantity: number;
  notes: string;
  properties: Record<string, unknown>;
}

export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  properties: Record<string, unknown>;
}

export function toDraft(item: CharacterItem): EquipmentItemDraft {
  return {
    id: item.id,
    category: item.category as EquipmentItemDraft['category'],
    name: item.name,
    quantity: item.quantity,
    notes: item.notes ?? '',
    properties: { ...(item.properties ?? {}) },
  };
}

export function newDraft(category: EquipmentItemDraft['category']): EquipmentItemDraft {
  return {
    id: `new-${crypto.randomUUID()}`,
    category,
    name: '',
    quantity: 1,
    notes: '',
    properties: {},
  };
}

export function sectionForItem(item: EquipmentItemDraft): EquipmentSectionKey {
  if (item.category === 'disposable') return 'consumables';
  if (item.category === 'treasure') return 'misc';
  if (item.category === 'weapon' || item.category === 'armor' || item.category === 'misc') {
    return item.category;
  }
  return 'misc';
}

export function ItemSummary({ item }: { item: EquipmentItemDraft }) {
  if (item.category === 'disposable') {
    const tags = formatConsumableTags(parseConsumableProperties(item.properties));
    return tags ? (
      <Typography variant="caption" color="text.secondary">
        {tags}
        {item.quantity > 1 ? ` · Qty ${item.quantity}` : ''}
      </Typography>
    ) : item.quantity > 1 ? (
      <Typography variant="caption" color="text.secondary">
        Qty {item.quantity}
      </Typography>
    ) : null;
  }
  if (item.category === 'weapon') {
    return (
      <Typography variant="caption" color="text.secondary">
        {formatWeaponSummary(item.properties)}
      </Typography>
    );
  }
  if (item.category === 'armor') {
    const tips = armorTooltipLines(item.properties);
    const label = formatArmorSummary(item.properties);
    return tips.length > 0 ? (
      <Tooltip title={tips.join(' · ')} arrow>
        <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
          {label} — hover for penalties
        </Typography>
      </Tooltip>
    ) : (
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    );
  }
  if (item.quantity > 1) {
    return (
      <Typography variant="caption" color="text.secondary">
        Qty {item.quantity}
      </Typography>
    );
  }
  return null;
}
