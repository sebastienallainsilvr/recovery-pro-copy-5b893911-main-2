import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function ContactForm({ contact, entreprises, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(contact || {
    entreprise_id: "",
    nom: "",
    prenom: "",
    fonction: "",
    email: "",
    telephone_fixe: "",
    telephone_mobile: "",
    est_contact_principal: false,
    actif: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Ajouter l'ID HubSpot de l'entreprise sélectionnée
    const entrepriseSelectionnee = entreprises.find(e => e.id === formData.entreprise_id);
    const dataToSubmit = {
      ...formData,
      company_id_hubspot: entrepriseSelectionnee?.company_id_hubspot || null
    };
    
    onSubmit(dataToSubmit);
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
          <Label htmlFor="fonction">Fonction</Label>
          <Input
            id="fonction"
            value={formData.fonction}
            onChange={(e) => handleChange('fonction', e.target.value)}
            placeholder="Ex: Directeur Financier"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prenom">Prénom *</Label>
          <Input
            id="prenom"
            value={formData.prenom}
            onChange={(e) => handleChange('prenom', e.target.value)}
            required
            placeholder="Prénom"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nom">Nom *</Label>
          <Input
            id="nom"
            value={formData.nom}
            onChange={(e) => handleChange('nom', e.target.value)}
            required
            placeholder="Nom"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="contact@entreprise.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telephone_fixe">Téléphone fixe</Label>
          <Input
            id="telephone_fixe"
            type="tel"
            value={formData.telephone_fixe}
            onChange={(e) => handleChange('telephone_fixe', e.target.value)}
            placeholder="01 23 45 67 89"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telephone_mobile">Téléphone mobile</Label>
          <Input
            id="telephone_mobile"
            type="tel"
            value={formData.telephone_mobile}
            onChange={(e) => handleChange('telephone_mobile', e.target.value)}
            placeholder="06 12 34 56 78"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="est_contact_principal"
            checked={formData.est_contact_principal}
            onCheckedChange={(checked) => handleChange('est_contact_principal', checked)}
          />
          <Label htmlFor="est_contact_principal">Contact principal de l'entreprise</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="actif"
            checked={formData.actif}
            onCheckedChange={(checked) => handleChange('actif', checked)}
          />
          <Label htmlFor="actif">Contact actif</Label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
          {contact ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}