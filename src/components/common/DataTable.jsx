import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatService } from "@/components/services/formatService";

export default function DataTable({ 
  title, 
  icon: Icon, 
  data, 
  columns, 
  loading, 
  pagination, 
  emptyMessage,
  onRowClick 
}) {
  const { 
    paginatedData, 
    currentPage, 
    totalPages, 
    nextPage, 
    prevPage, 
    goToPage, 
    hasPrevPage, 
    hasNextPage,
    startIndex,
    endIndex,
    totalItems
  } = pagination;

  const handleRowClick = (item) => {
    if (onRowClick) {
      onRowClick(item);
    }
  };
  
  return (
    <Card className="border border-slate-200 bg-white">
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5" />}
            {title}
          </CardTitle>
          {pagination && (
             <span className="text-sm text-slate-500">
              {formatService.number(totalItems)} résultats
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                {columns.map((col) => (
                  <TableHead key={col.header} className={`font-semibold ${col.className || ''}`}>
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? ( 
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((_, j) => (
                       <TableCell key={j}>
                        <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-12 text-slate-500">
                    {emptyMessage || "Aucune donnée trouvée."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow 
                    key={item.id} 
                    className={`hover:bg-slate-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => handleRowClick(item)}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.accessor} className={col.className || ''}>
                        {col.render ? col.render(item) : item[col.accessor]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {pagination && totalPages > 1 && (
        <CardFooter className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            {startIndex} - {endIndex} sur {formatService.number(totalItems)}
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={prevPage} 
              disabled={!hasPrevPage}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Précédent
            </Button>
            <span className="text-sm text-slate-600">
              Page {currentPage} / {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={nextPage} 
              disabled={!hasNextPage}
            >
              Suivant
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}