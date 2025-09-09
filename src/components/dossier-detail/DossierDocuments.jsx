import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Upload, 
  Plus,
  Calendar,
  User
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function DossierDocuments({ documents, dossier, onReload }) {
  const getDocumentColor = (type) => {
    switch (type) {
      case "Déclaration de créance":
        return "bg-red-100 text-red-800 border-red-200";
      case "Contrat":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Courrier":
        return "bg-green-100 text-green-800 border-green-200";
      case "Jugement":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white border border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents ({documents.length})
            </CardTitle>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Uploader document
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {documents.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {documents
                .sort((a, b) => new Date(b.date_upload) - new Date(a.date_upload))
                .map((document) => (
                  <div key={document.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                        {getFileIcon(document.nom_fichier)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {document.nom_fichier}
                          </h3>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger
                          </Button>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge className={getDocumentColor(document.type_document) + " border text-xs"}>
                            {document.type_document}
                          </Badge>
                          
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(document.date_upload), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                          </div>
                          
                          {document.upload_par && (
                            <div className="flex items-center gap-1 text-sm text-slate-500">
                              <User className="w-3 h-3" />
                              {document.upload_par}
                            </div>
                          )}
                        </div>
                        
                        {document.notes && (
                          <p className="text-slate-600 text-sm leading-relaxed">
                            {document.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">Aucun document uploadé</p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Uploader le premier document
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}