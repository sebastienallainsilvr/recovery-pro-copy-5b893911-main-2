import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAYS_OPTIONS = ["France", "Allemagne"];
const AGENTS = ["Maya", "Andrea", "Dylon", "Sébastien"];
const STATUTS = ["Active", "Inactive", "En procédure collective"];

export default function EntrepriseForm({ entreprise, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(entreprise || {
    company_id_hubspot: "",
    nom_entreprise: "",
    siren: "",
    siret: "",
    pays: "",
    agent_assigne: "",
    statut_entreprise: "",
    adresse_complete: "",
    telephone: "",
    email: "",
    contact_principal: "",
    notes_generales: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
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
          <Label htmlFor="nom_entreprise">Nom de l'entreprise *</Label>
          <Input
            id="nom_entreprise"
            value={formData.nom_entreprise}
            onChange={(e) => handleChange('nom_entreprise', e.target.value)}
            required
            placeholder="Nom de l'entreprise"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_id_hubspot">ID HubSpot</Label>
          <Input
            id="company_id_hubspot"
            type="number"
            value={formData.company_id_hubspot}
            onChange={(e) => handleChange('company_id_hubspot', e.target.value ? Number(e.target.value) : "")}
            placeholder="Identifiant HubSpot"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="siren">SIREN</Label>
          <Input
            id="siren"
            value={formData.siren}
            onChange={(e) => handleChange('siren', e.target.value)}
            maxLength={9}
            placeholder="9 chiffres"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="siret">SIRET</Label>
          <Input
            id="siret"
            value={formData.siret}
            onChange={(e) => handleChange('siret', e.target.value)}
            maxLength={14}
            placeholder="14 chiffres"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pays">Pays</Label>
          <Select value={formData.pays} onValueChange={(value) => handleChange('pays', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un pays" />
            </SelectTrigger>
            <SelectContent>
              {PAYS_OPTIONS.map((pays) => (
                <SelectItem key={pays} value={pays}>{pays}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent_assigne">Agent assigné</Label>
          <Select value={formData.agent_assigne} onValueChange={(value) => handleChange('agent_assigne', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un agent" />
            </SelectTrigger>
            <SelectContent>
              {AGENTS.map((agent) => (
                <SelectItem key={agent} value={agent}>{agent}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="statut_entreprise">Statut entreprise</Label>
          <Select value={formData.statut_entreprise} onValueChange={(value) => handleChange('statut_entreprise', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un statut" />
            </SelectTrigger>
            <SelectContent>
              {STATUTS.map((statut) => (
                <SelectItem key={statut} value={statut}>{statut}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_principal">Contact principal</Label>
          <Input
            id="contact_principal"
            value={formData.contact_principal}
            onChange={(e) => handleChange('contact_principal', e.target.value)}
            placeholder="Nom du contact"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input
            id="telephone"
            type="tel"
            value={formData.telephone}
            onChange={(e) => handleChange('telephone', e.target.value)}
            placeholder="Numéro de téléphone"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="adresse@email.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adresse_complete">Adresse complète</Label>
        <Textarea
          id="adresse_complete"
          value={formData.adresse_complete}
          onChange={(e) => handleChange('adresse_complete', e.target.value)}
          placeholder="Adresse complète de l'entreprise"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes_generales">Notes générales</Label>
        <Textarea
          id="notes_generales"
          value={formData.notes_generales}
          onChange={(e) => handleChange('notes_generales', e.target.value)}
          placeholder="Notes sur l'entreprise..."
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
          {entreprise ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}