
import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle, XCircle, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User } from "@/api/entities";


export default function AttachmentUploadModal({ isOpen, onClose, onConfirm, dossier }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState('upload'); // 'upload' or 'link'

  // States for upload mode
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // States for link mode
  const [driveLink, setDriveLink] = useState("");
  const [fileName, setFileName] = useState("");
  
  const [formData, setFormData] = useState({
    type_document: "Autre",
    notes: ""
  });

  const [currentUserFullName, setCurrentUserFullName] = useState("Agent"); // Default to "Agent"

  // Fetch current user's full name with debug
  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log("AttachmentUploadModal: Tentative de récupération de l'utilisateur...");
        const user = await User.me();
        console.log("AttachmentUploadModal: Utilisateur récupéré:", user);
        
        if (user && user.full_name) {
          console.log("AttachmentUploadModal: Nom complet trouvé:", user.full_name);
          setCurrentUserFullName(user.full_name);
        } else {
          console.log("AttachmentUploadModal: Pas de nom complet, utilisation de l'email:", user.email);
          setCurrentUserFullName(user.email || "Agent Inconnu");
        }
      } catch (error) {
        console.error("AttachmentUploadModal: Erreur lors de la récupération de l'utilisateur:", error);
        setCurrentUserFullName("Agent Inconnu");
      }
    };

    if (isOpen) { // Only fetch user when modal is opened
      fetchUser();
    }
  }, [isOpen]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null); // Clear selected file if nothing is chosen
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploadMode === 'upload' && !selectedFile) {
      toast.error("Veuillez sélectionner un fichier à uploader.");
      return;
    }
    if (uploadMode === 'link' && (!driveLink || !fileName)) {
      toast.error("Veuillez fournir un nom et un lien pour le document.");
      return;
    }

    console.log("AttachmentUploadModal: Soumission avec upload_par:", currentUserFullName);

    setIsUploading(true);
    try {
      if (uploadMode === 'upload') {
        await onConfirm({
          file: selectedFile,
          type_document: formData.type_document,
          notes: formData.notes,
          upload_par: currentUserFullName // Pass current user's full name
        });
      } else { // link mode
        await onConfirm({
          link: driveLink,
          fileName: fileName,
          type_document: formData.type_document,
          notes: formData.notes,
          upload_par: currentUserFullName // Pass current user's full name
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!dossier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une pièce jointe</DialogTitle>
          <DialogDescription>
            Uploadez un document pour le dossier de {dossier.entreprise?.nom_entreprise}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Source du document</Label>
            <RadioGroup value={uploadMode} onValueChange={setUploadMode} className="flex gap-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="upload" id="upload-mode" />
                <Label htmlFor="upload-mode" className="cursor-pointer">Uploader un fichier</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="link" id="link-mode" />
                <Label htmlFor="link-mode" className="cursor-pointer">Lien Google Drive</Label>
              </div>
            </RadioGroup>
          </div>

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
                <SelectItem value="Contrat">Contrat</SelectItem>
                <SelectItem value="Facture">Facture</SelectItem>
                <SelectItem value="Mise en demeure">Mise en demeure</SelectItem>
                <SelectItem value="Jugement">Jugement</SelectItem>
                <SelectItem value="Courrier">Courrier</SelectItem>
                <SelectItem value="Protocole">Protocole</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {uploadMode === 'upload' ? (
            <div className="space-y-2">
              <Label>Fichier</Label>
              <div 
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">{selectedFile.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Upload className="w-8 h-8" />
                    <p>Cliquez pour sélectionner un fichier</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="file_name">Nom du document *</Label>
                <Input
                  id="file_name"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Ex: Protocole d'accord signé.pdf"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drive_link">Lien Google Drive *</Label>
                <Input
                  id="drive_link"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Ajoutez une courte description du document..."
              rows={2}
            />
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
              <XCircle className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button type="submit" disabled={isUploading || (uploadMode === 'upload' && !selectedFile) || (uploadMode === 'link' && (!driveLink || !fileName))}>
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmer et Ajouter
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
