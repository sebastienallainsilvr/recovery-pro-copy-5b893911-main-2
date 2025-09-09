
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUTS_RECOUVREMENT = [
  "PENDING ASSIGNATION",
  "R1",
  "R2", 
  "R3",
  "R4",
  "R5",
  "PROMISE TO PAY",
  "UNDER NEGOTIATION",
  "CONCILIATION - PENDING ASSIGNATION",
  "CONCILIATION - ONGOING MEETINGS",
  "LAWYER / CONCILIATION",
  "REPAYMENT PLAN TO SCHEDULE",
  "REPAYMENT PLAN ONGOING",
  "DISPUTE / LITIGATION",
  "PENDING TO BE OUTSOURCED",
  "OUTSOURCED TO AGENCY",
  "COLLECTIVE PROCEDURE",
  "FULLY RECOVERED",
  "WRITTEN OFF / CANCELLED"
];

const FOURNISSEURS = ["SILVR", "SILVR_REPURCHASED", "SILVR_SLAM_FFS", "SLAM", "DELPHI_F1"];

export default function DossierForm({ dossier, entreprises, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(dossier || {
    entreprise_id: "",
    montant_initial: "",
    montant_total_paye: 0,
    statut_recouvrement: "",
    date_entree_statut: "",
    date_premier_impaye: "",
    fournisseur_pret: "",
    reference_contrat: "",
    taux_interet: "",
    notes: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      montant_initial: Number(formData.montant_initial),
      montant_total_paye: Number(formData.montant_total_paye || 0),
      taux_interet: formData.taux_interet ? Number(formData.taux_interet) : null
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="entreprise_id">Entreprise *</Label>
          <Select value={formData.entreprise_id} onValueChange={(value) => handleChange('entreprise_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une entreprise" />
            </SelectTrigger>
            <SelectContent>
              {entreprises.map((entreprise) => (
                <SelectItem key={entreprise.id} value={entreprise.id}>
                  {entreprise.nom_entreprise}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="montant_initial">Montant initial *</Label>
          <Input
            id="montant_initial"
            type="number"
            step="0.01"
            value={formData.montant_initial}
            onChange={(e) => handleChange('montant_initial', e.target.value)}
            required
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="montant_total_paye">Montant total payé</Label>
          <Input
            id="montant_total_paye"
            type="number"
            step="0.01"
            value={formData.montant_total_paye}
            onChange={(e) => handleChange('montant_total_paye', e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="statut_recouvrement">Statut recouvrement</Label>
          <Select value={formData.statut_recouvrement} onValueChange={(value) => handleChange('statut_recouvrement', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un statut" />
            </SelectTrigger>
            <SelectContent>
              {STATUTS_RECOUVREMENT.map((statut) => (
                <SelectItem key={statut} value={statut}>
                  {statut.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date_entree_statut">Date entrée statut</Label>
          <Input
            id="date_entree_statut"
            type="datetime-local"
            value={formData.date_entree_statut}
            onChange={(e) => handleChange('date_entree_statut', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date_premier_impaye">Date premier impayé</Label>
          <Input
            id="date_premier_impaye"
            type="date"
            value={formData.date_premier_impaye}
            onChange={(e) => handleChange('date_premier_impaye', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fournisseur_pret">Fournisseur prêt</Label>
          <Select value={formData.fournisseur_pret} onValueChange={(value) => handleChange('fournisseur_pret', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un fournisseur" />
            </SelectTrigger>
            <SelectContent>
              {FOURNISSEURS.map((fournisseur) => (
                <SelectItem key={fournisseur} value={fournisseur}>
                  {fournisseur.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference_contrat">Référence contrat</Label>
          <Input
            id="reference_contrat"
            value={formData.reference_contrat}
            onChange={(e) => handleChange('reference_contrat', e.target.value)}
            placeholder="Référence du contrat"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="taux_interet">Taux d'intérêt (%)</Label>
          <Input
            id="taux_interet"
            type="number"
            step="0.01"
            value={formData.taux_interet}
            onChange={(e) => handleChange('taux_interet', e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Notes sur le dossier..."
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
          {dossier ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}
