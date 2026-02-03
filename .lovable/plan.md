
## Plano: Correção da Logo Mobile e Ícone PWA

Este plano corrige os dois problemas identificados nas screenshots:

1. **Logo no header mobile** - Atualmente mostra um SVG simplificado, deveria mostrar a logo real 3D da FRACTTO
2. **Ícone PWA** - Mostra apenas "F" no iOS em vez da logo completa

---

### Diagnóstico dos Problemas

**Logo no Header Mobile:**
- O `MobileHeader.tsx` usa `/favicon.svg` que e um SVG simplificado criado manualmente
- A logo real da FRACTTO (`src/assets/logo-fractto.png`) e uma peca de quebra-cabeca 3D muito mais bonita
- O mesmo problema existe em `MobileSidebar.tsx`, `UnifiedSidebar.tsx` e `Auth.tsx`

**Icone PWA no iOS:**
- O iOS usa o `apple-touch-icon.png` para a tela inicial
- A imagem mostra apenas "F" porque o icone atual pode ter fundo transparente ou nao esta sendo reconhecido
- Para iOS, o icone precisa ter fundo solido e estar no tamanho correto (180x180)

---

### Solucao Proposta

#### Parte 1: Usar a Logo Real no Header

Modificar os componentes para usar a logo PNG real em vez do favicon SVG:

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/layout/MobileHeader.tsx` | Substituir `/favicon.svg` por import da logo PNG |
| `src/components/layout/MobileSidebar.tsx` | Substituir `/favicon.svg` por import da logo PNG |
| `src/components/layout/UnifiedSidebar.tsx` | Substituir `/favicon.svg` por import da logo PNG |
| `src/pages/Auth.tsx` | Substituir `/favicon.svg` por import da logo PNG |

Exemplo de mudanca:
```text
// Antes
<img src="/favicon.svg" alt="FRACTTO" className="h-8 w-8" />

// Depois  
import fracttoLogo from "@/assets/logo-fractto.png";
<img src={fracttoLogo} alt="FRACTTO" className="h-8 w-8 object-contain" />
```

#### Parte 2: Criar Icones PWA Corretos

Gerar novos icones otimizados para PWA com as seguintes caracteristicas:

| Arquivo | Tamanho | Descricao |
|---------|---------|-----------|
| `public/icons/icon-192.png` | 192x192 | Logo com padding e fundo escuro |
| `public/icons/icon-512.png` | 512x512 | Logo com padding e fundo escuro |
| `public/icons/icon-maskable.png` | 512x512 | Logo centralizada em safe zone (40% padding) com fundo escuro |
| `public/apple-touch-icon.png` | 180x180 | Logo com fundo solido para iOS |

Requisitos dos novos icones:
- Fundo solido azul escuro (#0f172a ou similar)
- Logo centralizada com padding adequado
- Bordas arredondadas para versao Apple
- Para maskable: 40% safe zone nas bordas

#### Parte 3: Atualizar Favicon SVG (Opcional)

Criar um novo `favicon.svg` mais limpo e representativo, baseado na forma da logo real.

---

### Arquivos a Serem Modificados

| Arquivo | Tipo de Alteracao |
|---------|-------------------|
| `src/components/layout/MobileHeader.tsx` | Importar e usar logo PNG |
| `src/components/layout/MobileSidebar.tsx` | Importar e usar logo PNG |
| `src/components/layout/UnifiedSidebar.tsx` | Importar e usar logo PNG |
| `src/pages/Auth.tsx` | Importar e usar logo PNG |
| `public/icons/icon-192.png` | Regenerar com fundo solido |
| `public/icons/icon-512.png` | Regenerar com fundo solido |
| `public/icons/icon-maskable.png` | Regenerar com safe zone correta |
| `public/apple-touch-icon.png` | Regenerar especifico para iOS |

---

### Nota Importante sobre Cache do iOS

Apos implementar as mudancas, para ver o novo icone no iOS:
1. Remover o app da tela inicial
2. Limpar cache do Safari (Ajustes > Safari > Limpar Historico e Dados)
3. Adicionar novamente a tela inicial

O iOS tem cache agressivo de icones PWA e pode demorar para atualizar.

---

### Resultado Esperado

- Header mobile mostrara a logo 3D bonita da FRACTTO
- Icone na tela inicial do iOS/Android mostrara a peca de quebra-cabeca completa
- Visual consistente em toda a aplicacao
