

## Plano: Atualização do Tema e Ícones PWA do FRACTTO

Este plano aborda duas alterações solicitadas:

1. **Atualização do Tema de Cores** - Alterar as cores do sistema para combinar com a logo FRACTTO
2. **Atualização dos Ícones PWA** - Substituir os ícones atuais pela logo FRACTTO para quando o app for adicionado à tela inicial

---

### Análise da Logo FRACTTO

A logo da FRACTTO é uma peça de quebra-cabeça 3D com as seguintes cores:
- **Azul ciano**: HSL aproximado `200 85% 55%`
- **Magenta/Rosa**: HSL aproximado `300 70% 55%`
- O gradiente vai do azul (esquerda) para o magenta/rosa (direita)

---

### Parte 1: Atualização do Tema de Cores

Vou atualizar o arquivo `src/index.css` para usar cores baseadas na logo:

**Modo Claro (Light Mode):**
- **Primary**: Azul-ciano (a cor dominante da logo)
- **Accent**: Magenta/rosa (cor secundária da logo)
- **Background**: Branco com tons suaves
- **Cards/Sidebar**: Tons neutros com leve influência azulada

**Modo Escuro (Dark Mode):**
- **Primary**: Versão mais vibrante do azul-ciano
- **Accent**: Magenta/rosa vibrante
- **Background**: Azul escuro profundo
- **Cards**: Tons de azul escuro

**Paleta proposta (HSL):**
```text
Light Mode:
- Primary: 210 80% 52% (azul)
- Accent: 300 70% 55% (magenta)
- Background: 0 0% 100%
- Foreground: 220 25% 15%
- Cards: 0 0% 100%
- Muted: 220 15% 96%
- Border: 220 15% 90%

Dark Mode:
- Primary: 210 85% 60% (azul vibrante)
- Accent: 300 75% 60% (magenta vibrante)
- Background: 220 40% 8%
- Foreground: 220 15% 95%
- Cards: 220 30% 12%
- Muted: 220 25% 18%
- Border: 220 25% 20%
```

---

### Parte 2: Atualização dos Ícones PWA

Para que a logo FRACTTO apareça quando o app for adicionado à tela inicial, preciso:

1. **Converter a logo para os tamanhos necessários:**
   - `icon-192.png` (192x192 pixels)
   - `icon-512.png` (512x512 pixels)
   - `icon-maskable.png` (512x512 com área segura para maskable)
   - `apple-touch-icon.png` (180x180 pixels)
   - `favicon.ico` / `favicon.svg`

2. **Gerar novas imagens** a partir da logo `src/assets/logo-fractto.png`

3. **Atualizar referências** no `manifest.json` e `index.html`

**Nota importante:** Para os ícones PWA, a logo atual (`logo-fractto.png`) precisa ser redimensionada e otimizada. A imagem existente tem alta resolução, então será possível gerar versões menores de qualidade.

---

### Arquivos a serem Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/index.css` | Atualizar variáveis CSS com nova paleta de cores (azul/magenta) |
| `public/manifest.json` | Atualizar `theme_color` e `background_color` |
| `index.html` | Atualizar `theme-color` meta tags |
| `public/icons/icon-192.png` | Substituir pela logo FRACTTO redimensionada |
| `public/icons/icon-512.png` | Substituir pela logo FRACTTO redimensionada |
| `public/icons/icon-maskable.png` | Criar versão maskable da logo |
| `public/apple-touch-icon.png` | Substituir pela logo FRACTTO |
| `public/favicon.svg` | Substituir pelo SVG da logo FRACTTO |

---

### Detalhes Técnicos

#### Mudanças no CSS (`src/index.css`)

```text
:root {
  --primary: 210 80% 52%;        /* Azul FRACTTO */
  --accent: 300 70% 55%;         /* Magenta FRACTTO */
  --border: 220 15% 90%;
  --sidebar-primary: 210 80% 52%;
  /* ... demais variáveis ajustadas */
}

.dark {
  --primary: 210 85% 60%;
  --accent: 300 75% 60%;
  --background: 220 40% 8%;
  /* ... demais variáveis ajustadas */
}
```

#### Mudanças no Manifest (`public/manifest.json`)

```text
{
  "theme_color": "#3b82f6",      /* Azul FRACTTO */
  "background_color": "#0f172a"  /* Azul escuro */
}
```

#### Mudanças no HTML (`index.html`)

```text
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#3b82f6">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1e3a8a">
```

---

### Resultado Esperado

Após a implementação:
- O sistema terá um visual consistente com a identidade visual da FRACTTO (azul e magenta)
- Quando o usuário adicionar o app à tela inicial do celular, verá a logo FRACTTO como ícone
- O tema será aplicado em todo o sistema (sidebar, botões, cards, gráficos, etc.)

