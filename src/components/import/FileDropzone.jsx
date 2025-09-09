import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle } from "lucide-react";

export default function FileDropzone({ onFileUpload }) {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const manualCsvParse = (csvText, delimiter) => {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 1) {
      return { data: [], meta: { fields: [] }, errors: [{ message: "Le fichier CSV est vide ou invalide." }] };
    }

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = lines[i].split(new RegExp(`${delimiter}(?=(?:[^"]*"[^"]*")*[^"]*$)`));
      
      if (values.length !== headers.length && lines[i].length > 0) {
        errors.push({ message: `Incohérence du nombre de colonnes à la ligne ${i + 1}. Attendu: ${headers.length}, Obtenu: ${values.length}` });
        continue;
      }
      
      const rowObject = {};
      headers.forEach((header, index) => {
        let value = values[index] || '';
        value = value.trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        value = value.replace(/""/g, '"');
        rowObject[header] = value;
      });
      data.push(rowObject);
    }
    
    return { data, meta: { fields: headers }, errors };
  };

  const processFile = useCallback((file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError("Veuillez sélectionner un fichier CSV");
      return;
    }

    setParsing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        
        // Détection initiale du délimiteur
        const firstLine = text.split('\n')[0];
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        let delimiter = semicolonCount > commaCount ? ';' : ',';

        let results = manualCsvParse(text, delimiter);

        // Heuristique de secours : si une seule colonne est détectée et qu'elle contient des ';',
        // forcer le délimiteur à être ';' et relancer le parsing.
        if (results.meta.fields.length === 1 && results.meta.fields[0].includes(';')) {
          delimiter = ';';
          results = manualCsvParse(text, delimiter);
        }

        if (results.errors.length > 0) {
          setError("Erreur lors du parsing du CSV: " + results.errors[0].message);
          setParsing(false);
          return;
        }

        const processedData = {
          fileName: file.name,
          headers: results.meta.fields,
          rows: results.data,
          delimiter: delimiter,
          totalRows: results.data.length
        };

        onFileUpload(processedData);
        setParsing(false);
      } catch (err) {
        setError("Erreur lors de la lecture du fichier: " + err.message);
        setParsing(false);
      }
    };
    
    reader.onerror = () => {
        setError("Impossible de lire le fichier.");
        setParsing(false);
    };

    reader.readAsText(file, 'UTF-8');
  }, [onFileUpload]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <Card>
      <CardContent className="p-8">
        <form 
            className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors relative
                ${isDragActive 
                  ? 'border-slate-400 bg-slate-50' 
                  : 'border-slate-200 hover:border-slate-300'
                }
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onSubmit={(e) => e.preventDefault()}
        >
          <input 
            type="file" 
            id="file-upload" 
            className="hidden" 
            accept=".csv"
            onChange={handleChange}
          />
          <label 
            htmlFor="file-upload" 
            className="w-full h-full flex flex-col items-center justify-center absolute top-0 left-0"
          >
            {parsing ? (
              <div className="space-y-4">
                <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full mx-auto" />
                <p className="text-slate-600">Analyse du fichier...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-slate-900">
                    {isDragActive 
                      ? "Déposez le fichier CSV ici" 
                      : "Glissez-déposez un fichier CSV ou cliquez pour sélectionner"
                    }
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    Formats supportés : CSV avec séparateur , ou ;
                  </p>
                  <p className="text-sm text-slate-500">
                    Compatible avec les exports HubSpot
                  </p>
                </div>
                <Button as="span" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Sélectionner un fichier
                </Button>
              </div>
            )}
          </label>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">Erreur</p>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}