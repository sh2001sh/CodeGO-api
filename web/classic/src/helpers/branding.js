/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

export const DEFAULT_LOGO = '/codexforall-logo.svg';

const INVALID_LOGO_VALUES = new Set(['', 'null', 'undefined', 'false', '0']);

export function normalizeLogoUrl(value) {
  if (typeof value !== 'string') return DEFAULT_LOGO;

  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_LOGO;
  if (INVALID_LOGO_VALUES.has(trimmed.toLowerCase())) return DEFAULT_LOGO;

  return trimmed;
}
