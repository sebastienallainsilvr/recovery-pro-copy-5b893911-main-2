import React, { useState, useEffect, useCallback } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, CheckCircle, XCircle, Copy } from "lucide-react";
import { User } from "@/api/entities";
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
  const [smsDirection, setSmsDirection] = useState("sortant");
  const [smsContent, setSmsContent] = useState("");
  const [currentUserFullName, setCurrentUserFullName] = useState("Agent");

  // Fetch current user's full name
  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log("ActionModal: Tentative de récupération de l'utilisateur...");
        const user = await User.me();
        console.log("ActionModal: Utilisateur récupéré:", user);
        
        if (user && user.full_name) {
          console.log("ActionModal: Nom complet trouvé:", user.full_name);
          setCurrentUserFullName(user.full_name);
        } else {
          console.log("ActionModal: Pas de nom complet, utilisation de l'email:", user.email);
          setCurrentUserFullName(user.email || "Agent Inconnu");
        }
      } catch (error) {
        console.error("ActionModal: Erreur lors de la récupération de l'utilisateur:", error);
        setCurrentUserFullName("Agent Inconnu");
      }
    };

    if (isOpen) {
      fetchUser();
    }
  }, [isOpen]);

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

  // Reset form fields when modal opens
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

  // Load templates when type changes
  useEffect(() => {
    if (isOpen && dossier) {
      if (typeAction === "Email manuel") {
        loadEmailTemplate();
      } else if (typeAction === "SMS") {
        loadSmsTemplate();
      }
    }
  }, [typeAction, isOpen, dossier, loadEmailTemplate, loadSmsTemplate]);

  const handleTypeChange = (newType) => {
    setTypeAction(newType);
    setResultat("");
    setDescription("");
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log("ActionModal: Soumission avec agent responsable:", currentUserFullName);
    
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
      description: finalDescription,
      agent_responsable: currentUserFullName
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle Action</DialogTitle>
          <DialogDescription>
            Enregistrer une action effectuée sur le dossier de {dossier?.entreprise?.nom_entreprise}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type d'action */}
          <div>
            <Label htmlFor="type_action">Type d'action</Label>
            <Select value={typeAction} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type d'action" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Email */}
          {typeAction === "Email manuel" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Template Email</Label>
                {emailTemplate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(emailTemplate)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copier
                  </Button>
                )}
              </div>
              <Textarea
                value={emailTemplate}
                readOnly
                className="h-32 bg-slate-50"
                placeholder="Chargement du template..."
              />
              {templateInfo && (
                <p className="text-xs text-slate-500">
                  Template: {templateInfo.statut} - Variables disponibles: {templateInfo.variables_disponibles}
                </p>
              )}
            </div>
          )}

          {/* Configuration SMS */}
          {typeAction === "SMS" && (
            <div className="space-y-4">
              <div>
                <Label>Direction du SMS</Label>
                <RadioGroup value={smsDirection} onValueChange={setSmsDirection} className="flex gap-6 mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sortant" id="sms-sortant" />
                    <Label htmlFor="sms-sortant">SMS sortant (envoyé)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="entrant" id="sms-entrant" />
                    <Label htmlFor="sms-entrant">SMS entrant (reçu)</Label>
                  </div>
                </RadioGroup>
              </div>

              {smsDirection === "sortant" && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Template SMS</Label>
                    {smsContent && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(smsContent)}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copier
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={smsContent}
                    readOnly
                    className="h-24 bg-slate-50"
                    placeholder="Chargement du template SMS..."
                  />
                </div>
              )}

              {smsDirection === "entrant" && (
                <div>
                  <Label htmlFor="sms_content">Contenu du SMS reçu</Label>
                  <Textarea
                    id="sms_content"
                    value={smsContent}
                    onChange={(e) => setSmsContent(e.target.value)}
                    className="h-24"
                    placeholder="Saisir le contenu du SMS reçu..."
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* Résultat */}
          <div>
            <Label htmlFor="resultat">Résultat</Label>
            <Select value={resultat} onValueChange={setResultat} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un résultat" />
              </SelectTrigger>
              <SelectContent>
                {RESULTATS.map((res) => (
                  <SelectItem key={res} value={res}>
                    {res}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Champs spéciaux pour promesse de paiement */}
          {resultat === 'Promesse de paiement' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="montant_promis">Montant promis (€)</Label>
                <Input
                  id="montant_promis"
                  type="number"
                  step="0.01"
                  value={montantPromis}
                  onChange={(e) => setMontantPromis(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label>Date de la promesse</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {datePromise ? format(datePromise, "dd/MM/yyyy", { locale: fr }) : "Sélectionner une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={datePromise}
                      onSelect={setDatePromise}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <Label htmlFor="description">Description / Notes</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails de l'action, notes importantes..."
              className="h-24"
              required
            />
          </div>

          <DialogFooter className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              <XCircle className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button type="submit">
              <CheckCircle className="w-4 h-4 mr-2" />
              Enregistrer l'action
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}