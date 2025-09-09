import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, TrendingUp, TrendingDown } from "lucide-react";

export default function AgentStatsCard({ agent, current, suggested }) {
  const total = current + suggested;
  const percentage = current > 0 ? (current / total) * 100 : 0;
  
  const getCardColor = () => {
    if (suggested === 0) return "border-green-200 bg-green-50";
    if (suggested > 5) return "border-red-200 bg-red-50";
    return "border-orange-200 bg-orange-50";
  };

  const getIcon = () => {
    if (suggested === 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (suggested > 5) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <User className="w-4 h-4 text-orange-600" />;
  };

  return (
    <Card className={`${getCardColor()} border-2`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="font-semibold">{agent}</span>
          {getIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Actuel:</span>
          <Badge variant="outline" className="font-semibold">
            {current}
          </Badge>
        </div>
        
        {suggested > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Suggéré:</span>
            <Badge className="bg-blue-100 text-blue-800 font-semibold">
              +{suggested}
            </Badge>
          </div>
        )}
        
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Après répartition:</span>
            <span className="font-semibold">{total}</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}