

## Plano: Correção do Auto-Scroll no Chat do JARVIS

O chat está começando do topo das mensagens em vez de mostrar as mensagens mais recentes (no final) quando a página é recarregada ou o usuário volta para o chat.

---

### Diagnóstico do Problema

O código atual tenta fazer auto-scroll assim:

```tsx
const scrollRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (scrollRef.current) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }
}, [messages, isSending]);

// ...
<ScrollArea ref={scrollRef} className="flex-1 py-4 px-4">
```

**O problema:** O componente `ScrollArea` do Radix UI tem uma estrutura interna onde:
- O `ref` passado vai para o elemento `Root` (container externo)
- Mas o scroll real acontece no elemento `Viewport` interno

Quando tentamos definir `scrollTop` no elemento `Root`, nada acontece porque não é ele que faz scroll - é o `Viewport` interno.

---

### Solução Proposta

Modificar o `ScrollArea` para expor uma ref para o `Viewport` e usar isso no chat:

1. **Atualizar `scroll-area.tsx`** - Adicionar uma prop `viewportRef` que permite acessar o Viewport diretamente

2. **Atualizar `JarvisChat.tsx`** - Usar a nova prop para fazer scroll no elemento correto

---

### Arquivos a Serem Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/ui/scroll-area.tsx` | Adicionar prop `viewportRef` para expor referencia ao Viewport |
| `src/pages/JarvisChat.tsx` | Usar `viewportRef` em vez de `ref` para o scroll |

---

### Detalhes Tecnicos

#### 1. Atualizar scroll-area.tsx

Adicionar uma prop opcional `viewportRef` que permite passar uma ref diretamente para o Viewport:

```tsx
interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  viewportRef?: React.RefObject<HTMLDivElement>;
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({ className, children, viewportRef, ...props }, ref) => (
  <ScrollAreaPrimitive.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
    <ScrollAreaPrimitive.Viewport 
      ref={viewportRef}
      className="h-full w-full rounded-[inherit]"
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
```

#### 2. Atualizar JarvisChat.tsx

Usar a nova prop `viewportRef` e garantir que o scroll aconteca apos as mensagens serem renderizadas:

```tsx
const scrollViewportRef = useRef<HTMLDivElement>(null);

// Auto-scroll to bottom when messages change or finish loading
useEffect(() => {
  // Small delay to ensure content is rendered
  const timer = setTimeout(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  }, 50);
  
  return () => clearTimeout(timer);
}, [messages, isSending, isLoading]);

// ...
<ScrollArea viewportRef={scrollViewportRef} className="flex-1 py-4 px-4">
```

A key change e adicionar `isLoading` como dependencia do useEffect. Isso garante que:
- Quando `isLoading` muda de `true` para `false` (mensagens carregadas), o scroll acontece
- O pequeno delay de 50ms garante que o DOM foi atualizado antes de calcular o scrollHeight

---

### Resultado Esperado

Apos a implementacao:
- Quando a pagina for recarregada, o chat automaticamente vai para o final (mensagens mais recentes)
- Quando o usuario voltar para a pagina de chat, vera as ultimas mensagens
- Quando novas mensagens forem enviadas/recebidas, o scroll continua funcionando

