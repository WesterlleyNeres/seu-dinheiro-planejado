import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useUserPhone } from "@/hooks/useUserPhone";
import { cn } from "@/lib/utils";
import { 
  MessageSquare, Phone, CheckCircle2, XCircle, 
  Loader2, Info, Trash2 
} from "lucide-react";

const formatToE164 = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("55")) return `+${digits}`;
  if (digits.length === 11) return `+55${digits}`;
  if (digits.length > 0) return `+${digits}`;
  return "";
};

const WhatsAppSection = () => {
  const { phone, isLoading, isVerified, savePhone, removePhone } = useUserPhone();
  const [phoneInput, setPhoneInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (phone?.phone_e164) {
      setPhoneInput(phone.phone_e164);
    }
  }, [phone]);

  const handleSavePhone = () => {
    const e164 = formatToE164(phoneInput);
    if (e164.length >= 13) {
      savePhone.mutate(e164);
      setIsEditing(false);
    }
  };

  const handleRemovePhone = () => {
    removePhone.mutate();
    setPhoneInput("");
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          WhatsApp
        </CardTitle>
        <CardDescription>
          Vincule seu WhatsApp para criar tarefas por mensagem
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Status</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {!phone 
                ? "Nenhum telefone vinculado"
                : isVerified
                  ? "Telefone verificado e ativo"
                  : "Aguardando verificação via WhatsApp"}
            </p>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              isVerified 
                ? "text-green-600 border-green-600" 
                : phone 
                  ? "text-yellow-600 border-yellow-600"
                  : "text-muted-foreground"
            )}
          >
            {isVerified ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verificado
              </>
            ) : phone ? (
              <>
                <Phone className="h-3 w-3 mr-1" />
                Pendente
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Não vinculado
              </>
            )}
          </Badge>
        </div>
        
        <Separator />
        
        {/* Campo de telefone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone (WhatsApp)</Label>
          <div className="flex gap-2">
            <Input
              id="phone"
              placeholder="+55 11 99999-9999"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              disabled={!isEditing && !!phone}
              className="flex-1"
            />
            {!phone || isEditing ? (
              <Button 
                size="sm" 
                onClick={handleSavePhone}
                disabled={savePhone.isPending || phoneInput.length < 10}
              >
                {savePhone.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Salvar"
                )}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(true)}
              >
                Editar
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Formato: +55 DDD Número (ex: +5511999999999)
          </p>
        </div>
        
        {/* Instruções de verificação */}
        {phone && !isVerified && (
          <>
            <Separator />
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle className="text-sm">Como verificar</AlertTitle>
              <AlertDescription className="text-xs">
                Envie "verificar" para o WhatsApp da GUTA. 
                Você receberá uma confirmação quando estiver ativo.
              </AlertDescription>
            </Alert>
          </>
        )}
        
        {/* Remover */}
        {phone && !isEditing && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-destructive">Remover vínculo</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Desvincula seu WhatsApp da GUTA
                </p>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleRemovePhone}
                disabled={removePhone.isPending}
              >
                {removePhone.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remover
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppSection;
