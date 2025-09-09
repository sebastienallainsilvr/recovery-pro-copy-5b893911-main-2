import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Action, EntrepriseDebiteur, DossierRecouvrement } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Phone, Mail, MessageSquare, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

import DataTable from "../components/common/DataTable";
import FilterBar from "../components/common/FilterBar";

import { useDataLoader } from "../components/hooks/useDataLoader";
import { useDataFiltering } from "../components/hooks/useDataFiltering";
import { usePagination } from "../components/hooks/usePagination";
import { formatService } from "../components/services/formatService";

const TYPES_ACTION = ["Appel sortant", "Appel entrant", "Email manuel", "SMS", "Courrier", "Visite", "Note interne", "Changement de statut"];
const AGENTS_VALIDES = ["Maya", "Andrea", "Dylon", "Sébastien"];

export default function Actions() {
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);

  const loadAllData = useCallback(async () => {
    const [actionsData, entreprisesData, dossiersData] = await Promise.all([
      Action.list("-date_action"),
      EntrepriseDebiteur.list(),
      DossierRecouvrement.list()
    ]);

    const enrichedActions = actionsData.map(action => ({
      ...action,
      entreprise: entreprisesData.find(e => e.id === action.entreprise_id),
      dossier: dossiersData.find(d => d.id === action.dossier_id)
    }));

    return enrichedActions;
  }, []);

  const { data: allActions, loading, refetch } = useDataLoader(loadAllData);

  const initialFilters = { type_action: 'all', agent_responsable: 'all' };
  const { filteredData: baseFilteredData, searchTerm, setSearchTerm, filters, setFilter, hasActiveFilters, resetFilters } = useDataFiltering(allActions, initialFilters);

  // Filtrage par date (logique spéciale)
  const dateFilteredData = useMemo(() => {
    let result = baseFilteredData;
    
    if (dateFrom) {
      result = result.filter(a => parseISO(a.date_action) >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(a => parseISO(a.date_action) <= dateTo);
    }
    
    return result;
  }, [baseFilteredData, dateFrom, dateTo]);

  const pagination = usePagination(dateFilteredData, 50);

  // Récupérer le filtre depuis les paramètres d'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    
    if (filterParam === 'appels') {
      setFilter('type_action', 'Appel sortant');
      const today = new Date();
      setDateFrom(startOfDay(today));
      setDateTo(endOfDay(today));
    } else if (filterParam === 'emails') {
      setFilter('type_action', 'Email manuel');
      const today = new Date();
      setDateFrom(startOfDay(today));
      setDateTo(endOfDay(today));
    } else if (filterParam === 'sms') {
      setFilter('type_action', 'SMS');
      const today = new Date();
      setDateFrom(startOfDay(today));
      setDateTo(endOfDay(today));
    }
  }, [setFilter]);

  const getTypeIcon = (type) => {
    if (type === "Appel sortant" || type === "Appel entrant") return <Phone className="w-4 h-4" />;
    if (type === "Email manuel") return <Mail className="w-4 h-4" />;
    if (type === "SMS") return <MessageSquare className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getTypeColor = (type) => {
    if (type === "Appel sortant" || type === "Appel entrant") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (type === "Email manuel") return "bg-blue-100 text-blue-800 border-blue-200";
    if (type === "SMS") return "bg-purple-100 text-purple-800 border-purple-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  const columns = useMemo(() => [
    {
      header: "Date/Heure",
      render: (item) => (
        <div className="text-sm">
          {formatService.date(item.date_action)}
          <br />
          <span className="text-xs text-slate-500">
            {format(parseISO(item.date_action), 'HH:mm', { locale: fr })}
          </span>
        </div>
      )
    },
    {
      header: "Type",
      render: (item) => (
        <Badge className={getTypeColor(item.type_action) + " border flex items-center gap-1 w-fit"}>
          {getTypeIcon(item.type_action)}
          {item.type_action}
        </Badge>
      )
    },
    {
      header: "Entreprise",
      render: (item) => (
        <div>
          <span className="font-medium">{item.entreprise?.nom_entreprise || "Inconnu"}</span>
          {item.entreprise?.company_id_hubspot && (
            <div className="text-xs text-slate-500">ID: {item.entreprise.company_id_hubspot}</div>
          )}
        </div>
      )
    },
    {
      header: "Agent",
      render: (item) => (
        <Badge variant="outline" className="text-xs">
          {item.agent_responsable}
        </Badge>
      )
    },
    {
      header: "Résultat",
      render: (item) => (
        item.resultat && (
          <Badge 
            variant="outline" 
            className={`text-xs ${
              item.resultat === 'Promesse de paiement' ? 'bg-green-50 text-green-700 border-green-200' :
              item.resultat === 'Contact établi' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              item.resultat === 'Pas de réponse' ? 'bg-orange-50 text-orange-700 border-orange-200' :
              'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            {item.resultat}
          </Badge>
        )
      )
    },
    {
      header: "Description",
      render: (item) => (
        <div className="text-sm text-slate-600 max-w-xs truncate">
          {item.description || "-"}
        </div>
      )
    }
  ], []);

  const filterOptions = useMemo(() => [
    {
      key: 'type_action',
      label: 'Type',
      type: 'select',
      value: filters.type_action,
      options: TYPES_ACTION.map(t => ({ value: t, label: t })),
      className: 'w-full sm:w-48'
    },
    {
      key: 'agent_responsable',
      label: 'Agent',
      type: 'select',
      value: filters.agent_responsable,
      options: AGENTS_VALIDES.map(a => ({ value: a, label: a })),
      className: 'w-full sm:w-32'
    }
  ], [filters]);

  const resetAllFilters = () => {
    resetFilters();
    setDateFrom(null);
    setDateTo(null);
  };

  const hasAnyActiveFilters = hasActiveFilters || dateFrom || dateTo;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Actions de Recouvrement
              {allActions.length > 0 && (
                <span className="text-xl font-normal text-slate-500 ml-2">
                  ({formatService.number(allActions.length)})
                </span>
              )}
            </h1>
            <p className="text-slate-600">Historique et suivi des actions réalisées</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Barre de filtres avec dates */}
          <div className="space-y-4">
            <FilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filters={filterOptions}
              onFilterChange={setFilter}
              onResetFilters={resetAllFilters}
              hasActiveFilters={hasAnyActiveFilters}
            />
            
            {/* Filtres de date supplémentaires */}
            <div className="flex flex-wrap items-center gap-4 bg-white border border-slate-200 rounded-lg p-4">
              <span className="text-sm font-medium text-slate-700">Période :</span>
              
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {dateFrom ? format(dateFrom, 'dd/MM', { locale: fr }) : 'Du'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {dateTo ? format(dateTo, 'dd/MM', { locale: fr }) : 'Au'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DataTable
            title={`Actions (${formatService.number(dateFilteredData.length)} trouvées)`}
            icon={Clock}
            data={dateFilteredData}
            columns={columns}
            loading={loading}
            pagination={pagination}
            emptyMessage="Aucune action trouvée."
          />
        </div>
      </div>
    </div>
  );
}