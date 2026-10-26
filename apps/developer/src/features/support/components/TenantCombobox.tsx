import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  cn,
} from '@dento/ui';
import { useTenants, type Tenant } from '../../tenants/hooks/useTenants.js';

interface TenantComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Whether the selected value should be the tenant _id or slug */
  mode?: 'id' | 'slug';
  placeholder?: string;
  disabled?: boolean;
}

export function TenantCombobox({
  value,
  onValueChange,
  mode = 'id',
  placeholder = 'Select tenant…',
  disabled,
}: TenantComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useTenants({ search: search || undefined, limit: 50 });
  const tenants = useMemo(() => data?.items ?? [], [data?.items]);

  const selected = useMemo(
    () => tenants.find((t) => (mode === 'slug' ? t.slug : t._id) === value),
    [tenants, value, mode],
  );

  function handleSelect(tenant: Tenant) {
    const tenantValue = mode === 'slug' ? tenant.slug : tenant._id;
    onValueChange(tenantValue === value ? '' : tenantValue);
    setOpen(false);
    setSearch('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', !selected && !value && 'text-muted-foreground')}
          disabled={disabled}
        >
          <span className="flex items-center gap-2 truncate">
            {selected ? (
              <>
                <Building2 className="h-4 w-4 shrink-0" />
                {selected.name.en}
                <span className="text-xs text-muted-foreground">({selected.slug})</span>
              </>
            ) : value ? (
              <span className="text-sm">{value}</span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search tenants…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{isLoading ? 'Loading…' : 'No tenants found.'}</CommandEmpty>
            <CommandGroup>
              {tenants.map((tenant) => {
                const tenantValue = mode === 'slug' ? tenant.slug : tenant._id;
                return (
                  <CommandItem
                    key={tenant._id}
                    value={tenant._id}
                    onSelect={() => handleSelect(tenant)}
                  >
                    <Check
                      className={cn(
                        'me-2 h-4 w-4',
                        value === tenantValue ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="flex items-center gap-2">
                        <span>{tenant.countryFlag}</span>
                        {tenant.name.en}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {tenant.slug} · {tenant.status} · {tenant.plan}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
