import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadFile } from "@/api/integrations";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2 
} from "lucide-react";

export default function UploadDocumentModal({ isOpen, onClose, dossier, onConfirm }) {
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    type_document: "Déclaration de créance",
    notes: ""
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      alert("Veuillez sélectionner un fichier PDF uniquement.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert("Veuillez sélectionner un fichier PDF.");
      return;
    }

    setUploading(true);
    
    try {
      // Upload du fichier
      const { file_url } = await UploadFile({ file: selectedFile });
      
      // Préparer les données du document
      const documentData = {
        dossier_id: dossier.id,
        type_document: formData.type_document,
        nom_fichier: selectedFile.name,
        date_upload: new Date().toISOString(),
        upload_par: "Agent", // TODO: récupérer l'utilisateur actuel
        fichier: file_url,
        notes: formData.notes
      };
      
      onConfirm(documentData);
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      alert("Erreur lors de l'upload du fichier. Veuillez réessayer.");
    } finally {
      setUploading(false);
    }
  };

  if (!dossier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Procédure Collective
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h4 className="font-semibold text-slate-900 mb-2">
              {dossier.entreprise?.nom_entreprise}
            </h4>
            <p className="text-sm text-orange-700">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Un document (déclaration de créance) est obligatoire pour passer en procédure collective.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type_document">Type de document</Label>
              <Select
                value={formData.type_document}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type_document: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Déclaration de créance">Déclaration de créance</SelectItem>
                  <SelectItem value="Jugement">Jugement</SelectItem>
                  <SelectItem value="Courrier">Courrier</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fichier PDF</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">{selectedFile.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm text-slate-600">
                      Cliquez pour sélectionner un fichier PDF
                    </p>
                  </div>
                )}
                
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? "Changer de fichier" : "Sélectionner PDF"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes sur le document..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
                <XCircle className="w-4 h-4 mr-2" />
                Annuler
              </Button>
              <Button 
                type="submit" 
                className="bg-orange-600 hover:bg-orange-700"
                disabled={uploading || !selectedFile}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmer & Changer Statut
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}