import { CSVUploader } from '@/components/import/CSVUploader';
import { ColumnMapper } from '@/components/import/ColumnMapper';
import { ImportPreview } from '@/components/import/ImportPreview';
import { ImportSummary } from '@/components/import/ImportSummary';
import { useImporter } from '@/hooks/useImporter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/layout/PageShell';
import { ChevronLeft, Upload, Settings, Eye, CheckCircle } from 'lucide-react';

const Import = () => {
  const {
    step,
    setStep,
    csvData,
    mapping,
    setMapping,
    preview,
    setPreview,
    summary,
    loading,
    presets,
    processFile,
    generatePreview,
    processImport,
    reset,
    savePreset,
    applyPreset,
  } = useImporter();

  const steps = [
    { key: 'upload', label: 'Upload', icon: Upload },
    { key: 'map', label: 'Mapear', icon: Settings },
    { key: 'preview', label: 'Revisar', icon: Eye },
    { key: 'summary', label: 'Resumo', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <PageShell>
      <div>
        <h1 className="text-3xl font-bold">Importar Transações</h1>
        <p className="text-muted-foreground">
          Importe suas transações de arquivos CSV
        </p>
      </div>

      {/* Stepper */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => {
              const Icon = s.icon;
              const isActive = index === currentStepIndex;
              const isComplete = index < currentStepIndex;

              return (
                <div key={s.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        isComplete
                          ? 'bg-primary text-primary-foreground'
                          : isActive
                          ? 'bg-primary/20 text-primary border-2 border-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`text-sm mt-2 ${
                        isActive ? 'font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-4 ${
                        isComplete ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <div>
        {step === 'upload' && <CSVUploader onFileSelect={processFile} />}

        {step === 'map' && csvData && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('upload')}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <ColumnMapper
              headers={csvData.headers}
              mapping={mapping}
              onMappingChange={setMapping}
              onNext={generatePreview}
              presets={presets}
              onApplyPreset={applyPreset}
              onSavePreset={savePreset}
            />
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('map')}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <ImportPreview
              preview={preview}
              onPreviewChange={setPreview}
              onImport={processImport}
              loading={loading}
            />
          </div>
        )}

        {step === 'summary' && summary && (
          <ImportSummary summary={summary} onReset={reset} />
        )}
      </div>
    </PageShell>
  );
};

export default Import;
