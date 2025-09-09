import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, CheckCircle, XCircle, Copy } from "lucide-react";
import * as templates from './templates';

const ACTION_TYPES = ["Appel sortant", "Appel entrant", "Email manuel", "SMS", "Courrier", "Visite", "Note interne"];
const RESULTATS = ["Contact établi", "Promesse de paiement", "Refus de payer", "Contestation", "Demande d'information", "Pas de réponse", "Autre"];

export default function ActionModal({ isOpen, onClose, dossier, onConfirm, preselectedType }) {
  const [typeAction, setTypeAction] = useState(preselectedType || "Appel sortant");
  const [resultat, setResultat] = useState("");
  const [montantPromis, setMontantPromis] = useState("");
  const [datePromise, setDatePromise] = useState(null);
  const [description, setDescription] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("");
  const [templateInfo, setTemplateInfo] = useState(null);
  
  // Nouveaux states pour SMS
  const [smsDirection, setSmsDirection] = useState("sortant");
  const [smsContent, setSmsContent] = useState("");

  const loadEmailTemplate = useCallback(async () => {
    if (!dossier?.statut_recouvrement) return;
    
    try {
      const templateData = await templates.getTemplate(dossier.statut_recouvrement, 'Email', dossier);
      setEmailTemplate(`Objet : ${templateData.objet}\n\n${templateData.contenu}`);
      setTemplateInfo(templateData);
    } catch (error) {
      console.error("Erreur lors du chargement du template email:", error);
      setEmailTemplate("Impossible de charger le template d'email.");
      setTemplateInfo(null);
    }
  }, [dossier]);

  const loadSmsTemplate = useCallback(async () => {
    if (!dossier?.statut_recouvrement) return;
    
    try {
      const templateData = await templates.getTemplate(dossier.statut_recouvrement, 'SMS', dossier);
      setSmsContent(templateData.contenu);
    } catch (error) {
      console.error("Erreur lors du chargement du template SMS:", error);
      setSmsContent("Impossible de charger le template SMS.");
    }
  }, [dossier]);

  // Effect 1: Reset form fields when modal opens or dossier changes
  useEffect(() => {
    if (isOpen && dossier) {
      setTypeAction(preselectedType || "Appel sortant");
      setResultat("");
      setMontantPromis("");
      setDatePromise(null);
      setDescription("");
      setEmailTemplate("");
      setTemplateInfo(null);
      setSmsDirection("sortant");
      setSmsContent("");
    }
  }, [isOpen, dossier, preselectedType]);

  // Effect 2: Load email template when typeAction changes to "Email manuel"
  useEffect(() => {
    if (isOpen && dossier && typeAction === "Email manuel") {
      loadEmailTemplate();
    } else {
      setEmailTemplate("");
      setTemplateInfo(null);
    }
  }, [isOpen, dossier, typeAction, loadEmailTemplate]);

  // Effect 3: Load SMS template when typeAction is SMS and direction is sortant
  useEffect(() => {
    if (isOpen && dossier && typeAction === "SMS" && smsDirection === "sortant") {
      loadSmsTemplate();
    } else if (typeAction === "SMS" && smsDirection === "entrant") {
      setSmsContent("");
    }
  }, [isOpen, dossier, typeAction, smsDirection, loadSmsTemplate]);

  const handleTypeChange = (value) => {
    setTypeAction(value);
    setResultat("");
    setSmsDirection("sortant");
    setSmsContent("");
  };

  const handleCopy = () => {
    if (typeAction === "Email manuel") {
      navigator.clipboard.writeText(emailTemplate);
    } else if (typeAction === "SMS" && smsDirection === "sortant") {
      navigator.clipboard.writeText(smsContent);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Construire la description finale avec préfixe SMS si nécessaire
    let finalDescription = description;
    if (typeAction === "SMS") {
      const prefix = smsDirection === "sortant" ? "[SMS SORTANT]" : "[SMS ENTRANT]";
      if (smsDirection === "entrant" && smsContent) {
        finalDescription = `${prefix} ${smsContent}${description ? ` - ${description}` : ''}`;
      } else {
        finalDescription = `${prefix} ${description}`;
      }
    }

    onConfirm({
      type_action: typeAction,
      resultat,
      montant_promis: resultat === 'Promesse de paiement' ? Number(montantPromis) : null,
      date_promise: resultat === 'Promesse de paiement' && datePromise ? format(datePromise, "yyyy-MM-dd") : null,
      description: finalDescription
    });
  };

  if (!dossier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enregistrer une action</DialogTitle>
          <DialogDescription>
            Pour: {dossier.entreprise?.nom_entreprise}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type_action">Type d'action</Label>
            <Select value={typeAction} onValueChange={handleTypeChange}>
              <SelectTrigger id="type_action">
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {typeAction === "Appel sortant" && (
            <div className="p-4 border rounded-md bg-slate-50 space-y-4">
              <p className="text-sm font-medium">Téléphone: {dossier.entreprise?.telephone || "Non renseigné"}</p>
              <div className="space-y-2">
                <Label htmlFor="resultat">Résultat de l'appel</Label>
                <Select value={resultat} onValueChange={setResultat}>
                  <SelectTrigger id="resultat"><SelectValue placeholder="Sélectionner un résultat" /></SelectTrigger>
                  <SelectContent>
                    {RESULTATS.map(res => <SelectItem key={res} value={res}>{res}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {resultat === 'Promesse de paiement' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="montant_promis">Montant promis</Label>
                    <Input id="montant_promis" type="number" value={montantPromis} onChange={e => setMontantPromis(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Date promesse</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {datePromise ? format(datePromise, 'PPP', { locale: fr }) : 'Sélectionner'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={datePromise} onSelect={setDatePromise} disabled={(date) => date < new Date()} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          )}

          {typeAction === "Email manuel" && (
            <div className="p-4 border rounded-md bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Template pour statut "{dossier.statut_recouvrement}"</Label>
                <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copier
                </Button>
              </div>
              
              <Textarea 
                value={emailTemplate} 
                readOnly 
                rows={10} 
                className="bg-white text-sm font-mono" 
              />
              
              {templateInfo?.template && templateInfo.template.variables_disponibles && (
                <div className="text-xs text-slate-500 mt-2">
                  <p><strong>Variables disponibles :</strong></p>
                  <p>{templateInfo.template.variables_disponibles}</p>
                </div>
              )}
            </div>
          )}

          {typeAction === "SMS" && (
            <div className="p-4 border rounded-md bg-slate-50 space-y-4">
              <div className="space-y-3">
                <Label>Direction du SMS</Label>
                <RadioGroup value={smsDirection} onValueChange={setSmsDirection} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sortant" id="sms-sortant" />
                    <Label htmlFor="sms-sortant">SMS sortant</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="entrant" id="sms-entrant" />
                    <Label htmlFor="sms-entrant">SMS entrant</Label>
                  </div>
                </RadioGroup>
              </div>

              {smsDirection === "sortant" ? (
                <div className="space-y-3">
                  <Label>Template SMS pour statut "{dossier.statut_recouvrement}"</Label>
                  <div className="bg-white border rounded p-3 text-sm max-w-xs">
                    {smsContent || "Chargement du template..."}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copier SMS
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="sms_content">Contenu du SMS reçu *</Label>
                  <Textarea 
                    id="sms_content"
                    value={smsContent}
                    onChange={(e) => setSmsContent(e.target.value)}
                    placeholder="Tapez le contenu du SMS reçu..."
                    rows={3}
                    required
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description / Notes</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails de l'action..." />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              <XCircle className="w-4 h-4 mr-2" /> Annuler
            </Button>
            <Button type="submit">
              <CheckCircle className="w-4 h-4 mr-2" /> Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}