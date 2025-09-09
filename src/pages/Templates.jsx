import React, { useState, useEffect } from "react";
import { TemplatesCommunication } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Copy, Mail, MessageSquare, Save, X } from "lucide-react";

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await TemplatesCommunication.list();
      setTemplates(data);
    } catch (error) {
      console.error("Erreur lors du chargement des templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (templateData) => {
    try {
      if (editingTemplate) {
        await TemplatesCommunication.update(editingTemplate.id, templateData);
      } else {
        await TemplatesCommunication.create(templateData);
      }
      
      setShowForm(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    }
  };

  const handleCopyTemplate = (template) => {
    const content = template.type_template === 'Email' 
      ? `Objet : ${template.objet}\n\n${template.contenu}`
      : template.contenu;
    
    navigator.clipboard.writeText(content);
  };

  const getTypeIcon = (type) => {
    return type === 'Email' ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />;
  };

  const getStatutColor = (statut) => {
    const colors = {
      'R1': 'bg-blue-100 text-blue-800 border-blue-200',
      'R2': 'bg-blue-100 text-blue-800 border-blue-200',
      'R3': 'bg-orange-100 text-orange-800 border-orange-200',
      'R4': 'bg-red-100 text-red-800 border-red-200',
      'R5': 'bg-red-100 text-red-800 border-red-200',
      'PROMISE': 'bg-green-100 text-green-800 border-green-200',
      'PLAN': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[statut] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Templates de Communication</h1>
            <p className="text-slate-600">Gestion des modèles d'emails et SMS pour le recouvrement</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Template
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                {editingTemplate ? "Modifier le template" : "Nouveau template"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TemplateForm
                template={editingTemplate}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingTemplate(null);
                }}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Templates configurés ({templates.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Statut</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Objet/Aperçu</TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-4 bg-slate-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 rounded animate-pulse"></div></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    templates.map((template) => (
                      <TableRow key={template.id} className="hover:bg-slate-50">
                        <TableCell>
                          <Badge className={getStatutColor(template.statut) + " border"}>
                            {template.statut}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(template.type_template)}
                            <span>{template.type_template}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          {template.type_template === 'Email' && template.objet && (
                            <p className="font-medium text-sm mb-1">{template.objet}</p>
                          )}
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {template.contenu}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {template.variables_disponibles}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={template.actif ? "default" : "outline"}>
                            {template.actif ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTemplate(template);
                                setShowForm(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyTemplate(template)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TemplateForm({ template, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(template || {
    statut: "",
    type_template: "",
    objet: "",
    contenu: "",
    variables_disponibles: "{nom_entreprise}, {contact_principal}, {montant_restant_du}, {jours_retard}, {agent_assigne}",
    actif: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Statut</Label>
          <Select value={formData.statut} onValueChange={(value) => setFormData({...formData, statut: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="R1">R1</SelectItem>
              <SelectItem value="R2">R2</SelectItem>
              <SelectItem value="R3">R3</SelectItem>
              <SelectItem value="R4">R4</SelectItem>
              <SelectItem value="R5">R5</SelectItem>
              <SelectItem value="PROMISE">PROMISE</SelectItem>
              <SelectItem value="PLAN">PLAN</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={formData.type_template} onValueChange={(value) => setFormData({...formData, type_template: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Type de template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Email">Email</SelectItem>
              <SelectItem value="SMS">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Statut</Label>
          <div className="flex items-center space-x-2 pt-2">
            <Switch 
              checked={formData.actif}
              onCheckedChange={(checked) => setFormData({...formData, actif: checked})}
            />
            <span className="text-sm">{formData.actif ? 'Actif' : 'Inactif'}</span>
          </div>
        </div>
      </div>

      {formData.type_template === 'Email' && (
        <div className="space-y-2">
          <Label>Objet</Label>
          <Input
            value={formData.objet}
            onChange={(e) => setFormData({...formData, objet: e.target.value})}
            placeholder="Objet de l'email avec variables..."
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Contenu</Label>
        <Textarea
          value={formData.contenu}
          onChange={(e) => setFormData({...formData, contenu: e.target.value})}
          placeholder="Contenu du template avec variables..."
          rows={8}
        />
      </div>

      <div className="space-y-2">
        <Label>Variables disponibles</Label>
        <Input
          value={formData.variables_disponibles}
          onChange={(e) => setFormData({...formData, variables_disponibles: e.target.value})}
          placeholder="Liste des variables séparées par des virgules"
        />
        <p className="text-xs text-slate-500">
          Variables courantes : {'{nom_entreprise}'}, {'{contact_principal}'}, {'{montant_restant_du}'}, {'{jours_retard}'}, {'{agent_assigne}'}
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Annuler
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 mr-2" />
          {template ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}