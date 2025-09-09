import React, { useState } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, CheckCircle, XCircle } from "lucide-react";

export default function StatusChangeModal({ isOpen, onClose, dossier, newStatut, onConfirm }) {
  const [formData, setFormData] = useState({
    montant_promis: "",
    date_promise: null,
    motif: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dataToSubmit = {
      ...formData,
      montant_promis: formData.montant_promis ? Number(formData.montant_promis) : null,
      date_promise: formData.date_promise ? format(formData.date_promise, "yyyy-MM-dd") : null
    };
    
    onConfirm(dataToSubmit);
  };

  if (!dossier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Promesse de Paiement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold text-slate-900">{dossier.entreprise?.nom_entreprise}</h4>
            <p className="text-sm text-slate-600">
              Montant dû: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dossier.montant_restant_du || 0)}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="montant_promis">Montant promis</Label>
              <Input
                id="montant_promis"
                type="number"
                step="0.01"
                value={formData.montant_promis}
                onChange={(e) => setFormData(prev => ({ ...prev, montant_promis: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Date de promesse</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date_promise ? 
                      format(formData.date_promise, 'PPP', { locale: fr }) : 
                      'Sélectionner une date'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.date_promise}
                    onSelect={(date) => setFormData(prev => ({ ...prev, date_promise: date }))}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motif">Notes/Motif</Label>
              <Textarea
                id="motif"
                value={formData.motif}
                onChange={(e) => setFormData(prev => ({ ...prev, motif: e.target.value }))}
                placeholder="Détails de la promesse de paiement..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                <XCircle className="w-4 h-4 mr-2" />
                Annuler
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmer
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}