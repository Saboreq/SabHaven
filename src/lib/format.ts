export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes / 1024;
  let unit = units[0];

  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export function sanitizeFileName(name: string): string {
  return Array.from(name.normalize('NFKC'), replaceUnsafePathCharacter)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

export function hasUnsafePathCharacter(value: string): boolean {
  return Array.from(value).some(isUnsafePathCharacter);
}

function replaceUnsafePathCharacter(character: string): string {
  return isUnsafePathCharacter(character) ? '-' : character;
}

function isUnsafePathCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0;
  return character === '/' || character === '\\' || codePoint <= 31 || codePoint === 127;
}
