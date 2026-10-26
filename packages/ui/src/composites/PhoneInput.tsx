'use client';

import * as React from 'react';
import { ChevronsUpDown, Check, Search } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/Popover';
import { ScrollArea } from '../primitives/ScrollArea';
import {
  COUNTRIES,
  getFlagEmoji,
  findCountryByIso,
  detectCountryFromPhone,
  type Country,
} from '../data/countries';

export interface PhoneInputProps {
  /** Full phone value including dial code, e.g. "+966512345678" */
  value?: string;
  /** Called with the full phone string (dial code + number) */
  onChange?: (value: string) => void;
  /** ISO alpha-2 country code for the default selection, e.g. "SA" */
  defaultCountry?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dir?: 'ltr' | 'rtl';
}

/**
 * Phone input with searchable country code dropdown.
 *
 * Stores value as full international number (e.g. "+966512345678").
 * Shows flag + dial code button on the left, number input on the right.
 */
const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    { value = '', onChange, defaultCountry = 'SA', placeholder, disabled = false, className, dir },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');

    // Determine selected country from value or default
    const resolvedCountry = React.useMemo(() => {
      if (value) {
        const detected = detectCountryFromPhone(value);
        if (detected) return detected;
      }
      return findCountryByIso(defaultCountry) || COUNTRIES[0];
    }, [value, defaultCountry]);

    const [selectedCountry, setSelectedCountry] = React.useState<Country>(resolvedCountry);

    // Sync when defaultCountry or value changes externally
    React.useEffect(() => {
      setSelectedCountry(resolvedCountry);
    }, [resolvedCountry]);

    // Extract local number (strip dial code)
    const localNumber = React.useMemo(() => {
      if (!value) return '';
      const cleaned = value.replace(/\s/g, '');
      if (cleaned.startsWith(selectedCountry.dial)) {
        return cleaned.slice(selectedCountry.dial.length);
      }
      // If value doesn't start with +, treat as local number
      if (!cleaned.startsWith('+')) return cleaned;
      return cleaned;
    }, [value, selectedCountry]);

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const num = e.target.value.replace(/[^\d]/g, '');
      onChange?.(num ? `${selectedCountry.dial}${num}` : '');
    };

    const handleCountrySelect = (country: Country) => {
      setSelectedCountry(country);
      setOpen(false);
      setSearch('');
      // Re-emit with new dial code
      if (localNumber) {
        onChange?.(`${country.dial}${localNumber}`);
      }
    };

    const filtered = React.useMemo(() => {
      if (!search) return COUNTRIES;
      const q = search.toLowerCase();
      return COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.iso.toLowerCase().includes(q),
      );
    }, [search]);

    return (
      <div className={cn('flex', className)} dir="ltr">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className="flex h-10 w-[110px] shrink-0 items-center justify-between gap-1 rounded-e-none border-e-0 px-2"
            >
              <span className="flex items-center gap-1.5 text-sm">
                <span className="text-base leading-none">{getFlagEmoji(selectedCountry.iso)}</span>
                <span className="text-muted-foreground">{selectedCountry.dial}</span>
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="start">
            <div className="flex items-center border-b px-3 py-2">
              <Search className="me-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <ScrollArea className="h-[250px]">
              {filtered.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No country found
                </div>
              ) : (
                <div className="p-1">
                  {filtered.map((country) => (
                    <button
                      key={country.iso}
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground',
                        selectedCountry.iso === country.iso && 'bg-accent',
                      )}
                      onClick={() => handleCountrySelect(country)}
                    >
                      <span className="text-base leading-none">{getFlagEmoji(country.iso)}</span>
                      <span className="flex-1 truncate text-start">{country.name}</span>
                      <span className="text-muted-foreground">{country.dial}</span>
                      {selectedCountry.iso === country.iso && (
                        <Check className="h-4 w-4 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
        <Input
          ref={ref}
          type="tel"
          value={localNumber}
          onChange={handleNumberChange}
          placeholder={placeholder || 'Phone number'}
          disabled={disabled}
          className="rounded-s-none"
          dir={dir}
        />
      </div>
    );
  },
);

PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };
