import React from 'react';
import { Building2 } from 'lucide-react';
import type { CrmAgency } from '../../lib/supabase';

interface AgencyFilterProps {
  agencies: CrmAgency[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const AgencyFilter: React.FC<AgencyFilterProps> = ({ agencies, selectedIds, onChange }) => {
  const allSelected = selectedIds.length === agencies.length;

  const selectAll = () => {
    onChange(agencies.map(a => a.id));
  };

  const selectOnly = (id: string) => {
    onChange([id]);
  };

  const toggleAgency = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      // Shift+click toggles individual without affecting others
      if (selectedIds.includes(id)) {
        if (selectedIds.length === 1) return;
        onChange(selectedIds.filter(x => x !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    } else {
      // Normal click selects only this agency (or if it's the only one selected, select all)
      if (selectedIds.length === 1 && selectedIds[0] === id) {
        selectAll();
      } else {
        selectOnly(id);
      }
    }
  };

  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
      <div className="flex items-center gap-1.5 mr-1 flex-shrink-0">
        <Building2 className="w-3.5 h-3.5 text-steel-400" />
        <span className="text-xs font-medium text-steel-500">Filter:</span>
      </div>

      <button
        onClick={selectAll}
        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-150 whitespace-nowrap ${
          allSelected
            ? 'bg-navy-600 text-white border-navy-600 shadow-sm'
            : 'bg-white text-steel-600 border-steel-300 hover:border-navy-300 hover:text-navy-600'
        }`}
      >
        All ({agencies.length})
      </button>

      {agencies.map((agency) => {
        const isSelected = selectedIds.includes(agency.id);
        const isOnlySelected = selectedIds.length === 1 && selectedIds[0] === agency.id;
        const isParent = agency.agency_type === 'main';
        return (
          <button
            key={agency.id}
            onClick={(e) => toggleAgency(agency.id, e)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-150 whitespace-nowrap ${
              isOnlySelected
                ? isParent
                  ? 'bg-navy-600 text-white border-navy-600 shadow-sm ring-2 ring-navy-300/40'
                  : 'bg-gold-500 text-navy-900 border-gold-500 shadow-sm ring-2 ring-gold-300/40'
                : isSelected
                  ? isParent
                    ? 'bg-navy-600 text-white border-navy-600 shadow-sm'
                    : 'bg-gold-500 text-navy-900 border-gold-500 shadow-sm'
                  : 'bg-white text-steel-600 border-steel-300 hover:border-navy-300 hover:text-navy-600'
            }`}
          >
            {agency.name}
            {isParent && <span className="ml-1 opacity-60">(main)</span>}
          </button>
        );
      })}

      {!allSelected && selectedIds.length < agencies.length && (
        <span className="text-[10px] text-steel-400 ml-1 flex-shrink-0">shift+click to multi-select</span>
      )}
    </div>
  );
};
