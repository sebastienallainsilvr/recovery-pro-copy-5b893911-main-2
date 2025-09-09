import React, { useState, useEffect } from "react";
import { TemplatesCommunication } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Plus, Save, X, Eye } from "lucide-react";
import { replaceTemplateVariables } from "../kanban/templates"; // On réutilise la fonction

export default function TemplatesAdmin() {
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const data = await TemplatesCommunication.list();
    setTemplates(data);
    setLoading(false);
  };

  const handleEdit = (template) => {
    setEditingTemplate({ ...template });
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    const { id, ...dataToSave } = editingTemplate;

    if (id) {
      await TemplatesCommunication.update(id, dataToSave);
    } else {
      await TemplatesCommunication.create(dataToSave);
    }
    
    setEditingTemplate(null);
    loadTemplates();
  };

  const handleCancel = () => {
    setEditingTemplate(null);
  };

  const handleNew = () => {
    setEditingTemplate({
      statut: "R1",
      type_template: "Email",
      objet: "",
      contenu: "",
      variables_disponibles: "",
      actif: true
    });
  };

  const handleChange = (field, value) => {
    setEditingTemplate(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Liste des templates */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Templates ({templates.length})</CardTitle>
            <Button size="sm" onClick={handleNew}>
              <Plus className="w-4 h-4 mr-2" /> Nouveau
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {templates.map(template => (
            <div 
              key={template.id}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                editingTemplate?.id === template.id ? 'bg-blue-100' : 'hover:bg-slate-100'
              }`}
              onClick={() => handleEdit(template)}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{template.statut} - {template.type_template}</span>
                <Badge variant={template.actif ? "default" : "outline"}>
                  {template.actif ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 truncate">{template.objet || template.contenu}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Éditeur de template */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>
            {editingTemplate ? (editingTemplate.id ? "Modifier le template" : "Nouveau template") : "Sélectionner un template"}
          </CardTitle>
        </CardHeader>
        {editingTemplate && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={editingTemplate.statut} onValueChange={(v) => handleChange('statut', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["R1", "R2", "R3", "R4", "R5", "PROMISE", "PLAN"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editingTemplate.type_template} onValueChange={(v) => handleChange('type_template', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {editingTemplate.type_template === 'Email' && (
              <div className="space-y-2">
                <Label>Objet</Label>
                <Input value={editingTemplate.objet} onChange={(e) => handleChange('objet', e.target.value)} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Contenu</Label>
              <Textarea value={editingTemplate.contenu} onChange={(e) => handleChange('contenu', e.target.value)} rows={10} />
            </div>

            <div className="space-y-2">
              <Label>Variables disponibles</Label>
              <Input value={editingTemplate.variables_disponibles} onChange={(e) => handleChange('variables_disponibles', e.target.value)} placeholder="{nom_entreprise}, {montant_restant_du}, etc."/>
              <p className="text-xs text-slate-500">Variables à séparer par des virgules.</p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="actif" checked={editingTemplate.actif} onCheckedChange={(c) => handleChange('actif', c)} />
              <Label htmlFor="actif">Actif</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="ghost" onClick={handleCancel}><X className="w-4 h-4 mr-2"/>Annuler</Button>
              <Button onClick={handleSave}><Save className="w-4 h-4 mr-2"/>Sauvegarder</Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}