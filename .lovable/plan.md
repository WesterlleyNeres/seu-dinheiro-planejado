

# Plano de Implementacao - Pagina JarvisMemory

## Resumo

Implementar a pagina de Memoria do JARVIS (`/jarvis/memory`) com listagem, filtros, busca e acoes sobre itens de memoria, seguindo o estilo visual Nectar (dark mode, cards minimalistas).

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/pages/JarvisMemory.tsx` | Criar | Pagina principal de memorias |
| `src/components/jarvis/MemoryCard.tsx` | Criar | Card individual de memoria (estilo Nectar) |
| `src/components/jarvis/MemoryForm.tsx` | Criar | Dialog para criar nova memoria |
| `src/components/jarvis/JarvisSidebar.tsx` | Modificar | Adicionar link "Memoria" |
| `src/App.tsx` | Modificar | Adicionar rota `/jarvis/memory` |

---

## Detalhamento Tecnico

### 1. Componente MemoryCard (`src/components/jarvis/MemoryCard.tsx`)

Card minimalista inspirado no `TaskCardNectar`:

```text
+------------------------------------------+
| [kind badge]                    [menu ⋮] |
| Titulo (ou primeiras palavras)           |
| Trecho do conteudo (line-clamp-2)...     |
| [data formatada]     [copiar] [ver mais] |
+------------------------------------------+
```

Funcionalidades:
- Badge colorido por `kind` (profile=roxo, preference=azul, decision=amarelo, project=verde, note=cinza, message=ciano)
- Botao "Copiar" usando `navigator.clipboard.writeText()`
- Botao "Ver mais" abre dialog com conteudo completo
- Menu dropdown com opcao "Excluir"
- Skeleton loading durante carregamento

### 2. Pagina JarvisMemory (`src/pages/JarvisMemory.tsx`)

Estrutura:
```text
+------------------------------------------+
| [icone] Memoria                          |
|         X itens salvos      [+ Nova]     |
+------------------------------------------+
| [Dropdown Kind ▼]  [🔍 Buscar...      ]  |
+------------------------------------------+
| [MemoryCard] [MemoryCard] [MemoryCard]   |
| ...grid responsivo...                    |
+------------------------------------------+
```

Filtros:
- Dropdown por `kind` com opcoes: Todos, Perfil, Preferencia, Decisao, Projeto, Nota, Mensagem
- Input de busca com debounce de 300ms (usa `searchMemory()` do hook)

Estados:
- Loading: grid de 6 Skeletons
- Empty: icone + mensagem "Nenhuma memoria salva"
- Filtered empty: "Nenhum resultado para os filtros aplicados"

### 3. Formulario de Criacao (`src/components/jarvis/MemoryForm.tsx`)

Dialog com campos:
- `kind`: Select com opcoes predefinidas
- `title`: Input opcional
- `content`: Textarea (obrigatorio)
- `source`: Hidden, default "manual"

### 4. Modificacao no Sidebar (`JarvisSidebar.tsx`)

Adicionar item na lista `jarvisNav`:
```typescript
{ icon: Brain, label: "Memoria", href: "/jarvis/memory" }
```
Usar icone `Lightbulb` ou `BookOpen` do lucide-react para diferenciar de "Inicio".

### 5. Rota no App.tsx

Adicionar apos `/jarvis/settings`:
```tsx
<Route
  path="/jarvis/memory"
  element={
    <ProtectedRoute>
      <ErrorBoundary>
        <JarvisLayout>
          <JarvisMemory />
        </JarvisLayout>
      </ErrorBoundary>
    </ProtectedRoute>
  }
/>
```

---

## Mapeamento de Kinds (Cores e Labels)

| kind | Label PT | Cor Badge |
|------|----------|-----------|
| profile | Perfil | `bg-purple-500/20 text-purple-400` |
| preference | Preferencia | `bg-blue-500/20 text-blue-400` |
| decision | Decisao | `bg-yellow-500/20 text-yellow-400` |
| project | Projeto | `bg-green-500/20 text-green-400` |
| note | Nota | `bg-muted text-muted-foreground` |
| message | Mensagem | `bg-cyan-500/20 text-cyan-400` |

---

## Logica de Debounce para Busca

```typescript
const [searchQuery, setSearchQuery] = useState("");
const [debouncedQuery, setDebouncedQuery] = useState("");

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedQuery(searchQuery);
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);

const filteredItems = useMemo(() => {
  let items = debouncedQuery 
    ? searchMemory(debouncedQuery) 
    : memoryItems;
  
  if (kindFilter !== "all") {
    items = items.filter(i => i.kind === kindFilter);
  }
  
  return items;
}, [memoryItems, debouncedQuery, kindFilter]);
```

---

## Dialog "Ver Mais" (Detalhes da Memoria)

Ao clicar em "Ver mais", abre um Dialog mostrando:
- Titulo completo
- Kind badge
- Data de criacao formatada
- Conteudo completo (scrollable)
- Source badge (manual/whatsapp/etc)
- Botao "Copiar tudo"
- Botao "Fechar"

---

## Responsividade

- Desktop: Grid de 3 colunas
- Tablet: Grid de 2 colunas
- Mobile: 1 coluna

Classes Tailwind:
```css
grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3
```

---

## Consideracoes de Seguranca

- O hook `useJarvisMemory` ja filtra por `tenant_id` via RLS
- Delete e feito direto (tabela nao tem `deleted_at`)
- Confirmacao antes de deletar com `window.confirm()`

---

## Entregaveis

1. `src/pages/JarvisMemory.tsx` - Pagina completa
2. `src/components/jarvis/MemoryCard.tsx` - Card individual
3. `src/components/jarvis/MemoryForm.tsx` - Dialog de criacao
4. `src/components/jarvis/JarvisSidebar.tsx` - Link adicionado
5. `src/App.tsx` - Rota registrada

