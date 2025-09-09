import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RotateCcw } from 'lucide-react';

export default function FilterBar({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  onResetFilters,
  hasActiveFilters,
  className = ''
}) {
  return (
    <Card className={`bg-white border border-slate-200 ${className}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search Bar */}
          <div className="relative w-full sm:w-auto sm:flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Dynamic Filters */}
          <div className="flex flex-wrap items-center gap-4">
            {filters.map(filter => {
              if (filter.type === 'select') {
                return (
                  <div key={filter.key} className={filter.className}>
                    <Select value={filter.value} onValueChange={(value) => onFilterChange(filter.key, value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={filter.placeholder || filter.label} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        {filter.options.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
              if (filter.type === 'buttons') {
                return (
                  <div key={filter.key} className="flex items-center gap-2">
                    {filter.options.map(option => (
                      <Button
                        key={option.value}
                        variant={filter.value === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => onFilterChange(filter.key, filter.value === option.value ? 'all' : option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                );
              }
              return null;
            })}
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="text-slate-600 hover:text-slate-900"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}