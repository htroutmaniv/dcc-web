import {
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stack,
  TextField,
} from '@mui/material';
import {
  consumablePropertiesToRecord,
  formatStackUsesSummary,
  getStackUsesAvailable,
  parseConsumableProperties,
  usesPerUnit,
  type ConsumableProperties,
} from '@dcc-web/shared';
import type { EquipmentItemDraft } from './equipment-types.js';

type EquipmentItemCategoryFieldsProps = {
  form: EquipmentItemDraft;
  setForm: React.Dispatch<React.SetStateAction<EquipmentItemDraft | null>>;
};

export function EquipmentItemCategoryFields({ form, setForm }: EquipmentItemCategoryFieldsProps) {
  if (form.category === 'weapon') {
    return (
      <>
        <TextField
          label="Damage"
          value={String(form.properties.damage ?? '')}
          onChange={(e) =>
            setForm((f) =>
              f ? { ...f, properties: { ...f.properties, damage: e.target.value } } : f,
            )
          }
          placeholder="1d6"
        />
        <TextField
          label="Attack bonus"
          type="number"
          value={Number(form.properties.attackBonus ?? 0)}
          onChange={(e) =>
            setForm((f) =>
              f
                ? {
                    ...f,
                    properties: {
                      ...f.properties,
                      attackBonus: Number.parseInt(e.target.value, 10) || 0,
                    },
                  }
                : f,
            )
          }
        />
      </>
    );
  }

  if (form.category === 'armor') {
    return (
      <>
        <TextField
          label="AC bonus"
          type="number"
          value={Number(form.properties.acBonus ?? 0)}
          onChange={(e) =>
            setForm((f) =>
              f
                ? {
                    ...f,
                    properties: {
                      ...f.properties,
                      acBonus: Number.parseInt(e.target.value, 10) || 0,
                    },
                  }
                : f,
            )
          }
        />
        <TextField
          label="Speed penalty (ft)"
          type="number"
          value={Number(form.properties.speedPenalty ?? 0)}
          onChange={(e) =>
            setForm((f) =>
              f
                ? {
                    ...f,
                    properties: {
                      ...f.properties,
                      speedPenalty: Number.parseInt(e.target.value, 10) || 0,
                    },
                  }
                : f,
            )
          }
        />
        <TextField
          label="Check penalty"
          type="number"
          value={Number(form.properties.checkPenalty ?? 0)}
          onChange={(e) =>
            setForm((f) =>
              f
                ? {
                    ...f,
                    properties: {
                      ...f.properties,
                      checkPenalty: Number.parseInt(e.target.value, 10) || 0,
                    },
                  }
                : f,
            )
          }
        />
        <TextField
          label="Fumble die"
          value={String(form.properties.fumbleDie ?? '')}
          onChange={(e) =>
            setForm((f) =>
              f ? { ...f, properties: { ...f.properties, fumbleDie: e.target.value } } : f,
            )
          }
          placeholder="d16"
        />
        <TextField
          label="Spell check penalty"
          type="number"
          value={Number(form.properties.spellCheckPenalty ?? 0)}
          onChange={(e) =>
            setForm((f) =>
              f
                ? {
                    ...f,
                    properties: {
                      ...f.properties,
                      spellCheckPenalty: Number.parseInt(e.target.value, 10) || 0,
                    },
                  }
                : f,
            )
          }
        />
      </>
    );
  }

  if (form.category === 'disposable') {
    return (
      <>
        <FormGroup row sx={{ gap: 1, flexWrap: 'wrap' }}>
          {(
            [
              ['food', 'Food'],
              ['vessel', 'Vessel (drinks)'],
              ['fuel', 'Fuel (oil)'],
              ['light', 'Light source'],
              ['requiresFuel', 'Needs fuel (lantern)'],
              ['poisonous', 'Poisonous'],
              ['consumedWhenEmpty', 'Remove when empty'],
            ] as const
          ).map(([key, label]) => {
            const props = parseConsumableProperties(form.properties);
            const checked = Boolean(props[key as keyof ConsumableProperties]);
            return (
              <FormControlLabel
                key={key}
                control={
                  <Checkbox
                    size="small"
                    checked={checked}
                    onChange={(e) => {
                      const next: ConsumableProperties = {
                        ...props,
                        [key]: e.target.checked,
                      };
                      setForm((f) =>
                        f ? { ...f, properties: consumablePropertiesToRecord(next) } : f,
                      );
                    }}
                  />
                }
                label={label}
              />
            );
          })}
        </FormGroup>
        {parseConsumableProperties(form.properties).vessel && (
          <Stack direction="row" spacing={1}>
            <TextField
              label="Capacity"
              type="number"
              size="small"
              value={Number(parseConsumableProperties(form.properties).capacity ?? 1)}
              onChange={(e) => {
                const props = parseConsumableProperties(form.properties);
                const cap = Math.max(1, Number.parseInt(e.target.value, 10) || 1);
                setForm((f) =>
                  f
                    ? {
                        ...f,
                        properties: consumablePropertiesToRecord({
                          ...props,
                          capacity: cap,
                          usesRemaining: props.usesRemaining ?? cap,
                        }),
                      }
                    : f,
                );
              }}
            />
            <TextField
              label="Uses remaining"
              type="number"
              size="small"
              value={Number(
                parseConsumableProperties(form.properties).usesRemaining ??
                  parseConsumableProperties(form.properties).capacity ??
                  1,
              )}
              onChange={(e) => {
                const props = parseConsumableProperties(form.properties);
                const uses = Math.max(0, Number.parseInt(e.target.value, 10) || 0);
                setForm((f) =>
                  f
                    ? {
                        ...f,
                        properties: consumablePropertiesToRecord({
                          ...props,
                          usesRemaining: uses,
                        }),
                      }
                    : f,
                );
              }}
            />
            <TextField
              label="Unit label"
              size="small"
              value={parseConsumableProperties(form.properties).unitLabel ?? ''}
              onChange={(e) => {
                const props = parseConsumableProperties(form.properties);
                setForm((f) =>
                  f
                    ? {
                        ...f,
                        properties: consumablePropertiesToRecord({
                          ...props,
                          unitLabel: e.target.value.trim() || undefined,
                        }),
                      }
                    : f,
                );
              }}
              placeholder="day, oil, …"
            />
          </Stack>
        )}
        <TextField
          label="Quantity"
          type="number"
          value={form.quantity}
          onChange={(e) =>
            setForm((f) =>
              f ? { ...f, quantity: Math.max(1, Number.parseInt(e.target.value, 10) || 1) } : f,
            )
          }
        />
        {!parseConsumableProperties(form.properties).vessel && (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <TextField
              label="Uses (per item)"
              type="number"
              size="small"
              value={usesPerUnit(form.properties)}
              onChange={(e) => {
                const props = parseConsumableProperties(form.properties);
                const uses = Math.max(1, Number.parseInt(e.target.value, 10) || 1);
                const qty = form.quantity;
                setForm((f) =>
                  f
                    ? {
                        ...f,
                        properties: consumablePropertiesToRecord({
                          ...props,
                          uses,
                          usesRemaining: props.usesRemaining ?? uses * qty,
                        }),
                      }
                    : f,
                );
              }}
            />
            <TextField
              label="Uses left (current unit)"
              type="number"
              size="small"
              helperText={`Total: ${formatStackUsesSummary(form)}`}
              value={
                parseConsumableProperties(form.properties).usesRemaining ??
                getStackUsesAvailable(form)
              }
              onChange={(e) => {
                const props = parseConsumableProperties(form.properties);
                const left = Math.max(0, Number.parseInt(e.target.value, 10) || 0);
                setForm((f) =>
                  f
                    ? {
                        ...f,
                        properties: consumablePropertiesToRecord({
                          ...props,
                          usesRemaining: left,
                        }),
                      }
                    : f,
                );
              }}
            />
          </Stack>
        )}
      </>
    );
  }

  if (form.category === 'misc' || form.category === 'treasure') {
    return (
      <>
        <TextField
          label="Quantity"
          type="number"
          value={form.quantity}
          onChange={(e) =>
            setForm((f) =>
              f ? { ...f, quantity: Math.max(1, Number.parseInt(e.target.value, 10) || 1) } : f,
            )
          }
        />
        <Stack direction="row" spacing={1}>
          <TextField
            label="Uses (per item)"
            type="number"
            size="small"
            value={usesPerUnit(form.properties)}
            onChange={(e) => {
              const uses = Math.max(1, Number.parseInt(e.target.value, 10) || 1);
              const prev = form.properties ?? {};
              setForm((f) =>
                f
                  ? {
                      ...f,
                      properties: {
                        ...prev,
                        uses,
                        usesRemaining:
                          (prev.usesRemaining as number | undefined) ?? uses * f.quantity,
                      },
                    }
                  : f,
              );
            }}
          />
          <TextField
            label="Uses left (current unit)"
            type="number"
            size="small"
            helperText={`Total: ${formatStackUsesSummary(form)}`}
            value={
              (form.properties?.usesRemaining as number | undefined) ??
              getStackUsesAvailable(form)
            }
            onChange={(e) => {
              const left = Math.max(0, Number.parseInt(e.target.value, 10) || 0);
              setForm((f) =>
                f
                  ? {
                      ...f,
                      properties: {
                        ...(f.properties ?? {}),
                        uses: usesPerUnit(f.properties),
                        usesRemaining: left,
                      },
                    }
                  : f,
              );
            }}
          />
        </Stack>
      </>
    );
  }

  return null;
}
