import React, { useState, useEffect } from "react";
import { AppSettings } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Info } from "lucide-react";

export default function RulesAdmin() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const data = await AppSettings.list();
    // Group by category
    const grouped = data.reduce((acc, setting) => {
      const category = setting.category || 'Général';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(setting);
      return acc;
    }, {});
    setSettings(grouped);
    setLoading(false);
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
      for (const setting of allSettings) {
        await AppSettings.update(setting.id, { value: setting.value });
      }
      alert("Paramètres sauvegardés !");
    } catch (error) {
      console.error("Erreur de sauvegarde:", error);
      alert("Erreur lors de la sauvegarde des paramètres.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Chargement des règles...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Règles métier
          </CardTitle>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Sauvegarde..." : "Sauvegarder les règles"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(settings).map(([category, settingList]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold mb-3 border-b pb-2">{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {settingList.map(setting => (
                <div key={setting.key} className="space-y-2">
                  <Label htmlFor={setting.key}>{setting.description}</Label>
                  <Input
                    id={setting.key}
                    value={setting.value}
                    onChange={(e) => handleValueChange(category, setting.key, e.target.value)}
                    placeholder={setting.value}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}