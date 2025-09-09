import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, CheckCircle, AlertTriangle } from "lucide-react";

export default function DataPreview({ data, importType, typeInfo }) {
  const previewRows = data.rows.slice(0, 5);
  const lowercaseHeaders = data.headers.map(h => h.toLowerCase().trim());

  const getColumnStatus = (header) => {
    const lowerHeader = header.toLowerCase().trim();
    if (typeInfo?.requiredColumns.includes(lowerHeader)) {
      return "required";
    }
    if (typeInfo?.optionalColumns.includes(lowerHeader)) {
      return "optional";
    }
    return "unknown";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "required": return "bg-green-100 text-green-800 border-green-200";
      case "optional": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "required": return <CheckCircle className="w-3 h-3" />;
      case "optional": return <CheckCircle className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <FileText className="w-5 h-5" />
          Aperçu des données
          {importType && typeInfo && (
            <Badge className="flex items-center gap-1">
              <typeInfo.icon className="w-3 h-3" />
              {typeInfo.name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Informations sur le fichier */}
        <div className="flex items-center justify-between mb-6 p-4 bg-slate-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-600">Fichier</p>
              <p className="font-medium">{data.fileName}</p>
            </div>
            <div>
              <p className="text-slate-600">Lignes</p>
              <p className="font-medium">{data.totalRows}</p>
            </div>
            <div>
              <p className="text-slate-600">Colonnes</p>
              <p className="font-medium">{data.headers.length}</p>
            </div>
            <div>
              <p className="text-slate-600">Séparateur</p>
              <p className="font-medium">"{data.delimiter}"</p>
            </div>
          </div>
        </div>

        {/* Mapping des colonnes */}
        {importType && typeInfo && (
          <div className="mb-6">
            <h4 className="font-medium text-slate-900 mb-3">Colonnes détectées</h4>
            <div className="flex flex-wrap gap-2">
              {data.headers.map((header) => {
                const status = getColumnStatus(header);
                return (
                  <Badge 
                    key={header} 
                    className={getStatusColor(status) + " border text-xs flex items-center gap-1"}
                  >
                    {getStatusIcon(status)}
                    {header}
                  </Badge>
                );
              })}
            </div>
            
            {/* Légende */}
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span className="text-slate-600">Requis/Optionnel</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-orange-500" />
                <span className="text-slate-600">Non mappé</span>
              </div>
            </div>
          </div>
        )}

        {/* Aperçu des données */}
        <div>
          <h4 className="font-medium text-slate-900 mb-3">Aperçu (5 premières lignes)</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  {data.headers.map((header) => (
                    <TableHead key={header} className="font-medium text-xs">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, index) => (
                  <TableRow key={index}>
                    {data.headers.map((header) => (
                      <TableCell key={header} className="text-xs max-w-32 truncate">
                        {row[header] || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Avertissements */}
        {!importType && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-medium">Type d'import non détecté automatiquement</p>
            </div>
            <p className="text-orange-700 mt-1">
              Veuillez vérifier le format de votre fichier ou sélectionner manuellement le type d'import.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}