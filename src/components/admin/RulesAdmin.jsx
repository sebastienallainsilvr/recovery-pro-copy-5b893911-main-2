
import React, { useState, useEffect } from "react";
import { AppSettings } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Info, Clock, Target, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_ICONS = {
  "Délais": Clock,
  "Seuils": Target, 
  "Général": SettingsIcon
};

const CATEGORY_DESCRIPTIONS = {
  "Délais": "Délais d'action requis pour chaque statut de recouvrement",
  "Seuils": "Seuils et limites pour la classification des dossiers",
  "Général": "Paramètres généraux de l'application"
};

export default function RulesAdmin() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await AppSettings.list();
      // Forcer le filtrage pour ne jamais afficher la catégorie "Calculs"
      const filteredData = data.filter(setting => setting.category !== 'Calculs');
      
      // Grouper par catégorie
      const grouped = filteredData.reduce((acc, setting) => {
        const category = setting.category || 'Général';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(setting);
        return acc;
      }, {});
      setSettings(grouped);
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres:", error);
      toast.error("Erreur lors du chargement des règles métier");
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: prev[category].map(s => 
        s.key === key ? { ...s, value } : s
      )
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allSettings = Object.values(settings).flat();
      const updatePromises = allSettings.map(setting => 
        AppSettings.update(setting.id, { 
          key: setting.key,
          value: setting.value, 
          description: setting.description,
          category: setting.category 
        })
      );
      
      await Promise.all(updatePromises);
      toast.success("Règles métier sauvegardées avec succès !");
    } catch (error) {
      console.error("Erreur de sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde des règles métier");
    } finally {
      setSaving(false);
    }
  };

  const validateValue = (key, value) => {
    // Validation des valeurs numériques
    if (key.startsWith('DELAI_') || key.startsWith('SEUIL_') || key.includes('TAUX')) {
      const numValue = parseFloat(value);
      return !isNaN(numValue) && numValue >= 0;
    }
    return value.trim().length > 0;
  };

  const formatInputType = (key) => {
    if (key.startsWith('DELAI_') || key.startsWith('SEUIL_')) {
      return 'number';
    }
    if (key.includes('TAUX')) {
      return 'number';
    }
    return 'text';
  };

  const getInputStep = (key) => {
    if (key.includes('TAUX')) {
      return '0.1';
    }
    if (key.startsWith('SEUIL_MONTANT')) {
      return '100';
    }
    return '1';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            <span className="ml-2 text-slate-600">Chargement des règles...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Règles Métier
          </CardTitle>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Sauvegarde..." : "Sauvegarder les règles"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {Object.entries(settings).map(([category, settingList]) => {
          const IconComponent = CATEGORY_ICONS[category] || SettingsIcon;
          
          return (
            <div key={category} className="border border-slate-200 rounded-lg p-6 bg-slate-50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <IconComponent className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{category}</h3>
                  <p className="text-sm text-slate-600">{CATEGORY_DESCRIPTIONS[category]}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {settingList
                  .sort((a, b) => a.description.localeCompare(b.description))
                  .map(setting => {
                    const inputType = formatInputType(setting.key);
                    const inputStep = getInputStep(setting.key);
                    const isValid = validateValue(setting.key, setting.value);
                    
                    return (
                      <div key={setting.key} className="space-y-3 bg-white p-4 rounded-lg border border-slate-200">
                        <div>
                          <Label 
                            htmlFor={setting.key}
                            className="text-sm font-medium text-slate-700"
                          >
                            {setting.description}
                          </Label>
                          <div className="text-xs text-slate-500 mt-1">
                            Clé: {setting.key}
                          </div>
                        </div>
                        
                        <div className="relative">
                          <Input
                            id={setting.key}
                            type={inputType}
                            step={inputStep}
                            min="0"
                            value={setting.value}
                            onChange={(e) => handleValueChange(category, setting.key, e.target.value)}
                            placeholder={setting.value}
                            className={`${!isValid ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                          />
                          {!isValid && (
                            <div className="text-xs text-red-600 mt-1">
                              Valeur invalide
                            </div>
                          )}
                        </div>
                        
                        {/* Aide contextuelle pour certains paramètres */}
                        {setting.key.startsWith('DELAI_') && (
                          <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded">
                            💡 Nombre de jours après lequel une action est requise
                          </div>
                        )}
                        
                        {setting.key === 'SEUIL_MONTANT_ELEVE' && (
                          <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded">
                            💡 Montant en € au-dessus duquel un dossier est considéré comme important
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
