# Documentação do Sistema — IEC Gaspar Web (Monitoramento de Concorrentes)

Este documento descreve a arquitetura, o funcionamento interno e os fluxos de trabalho do sistema interno de monitoramento de pós-graduações (IEC Gaspar). Ele foi desenhado para que qualquer desenvolvedor tenha entendimento **total** do sistema, de ponta a ponta.

---

## 1. Visão Geral

O sistema é uma plataforma de Business Intelligence e Web Scraping desenhada para monitorar ofertas de cursos de pós-graduação de concorrentes (PUCRS, PUCPR, FGV, Descomplica, etc.). 
Ele captura dados brutros (preços, campanhas, modalidades), normaliza-os, detecta mudanças de preço/campanha ao longo do tempo e exibe essas informações através de um dashboard interativo.

### Stack Tecnológica
- **Framework Core**: Next.js 16.2 (App Router, Turbopack)
- **Linguagem**: TypeScript
- **Frontend / UI**: Tailwind CSS v4, `shadcn/ui`, `lucide-react`, Framer Motion (`motion/react`)
- **Backend / ORM**: Prisma ORM, PostgreSQL
- **Autenticação**: NextAuth.js
- **Motor de Scraping (Crawler)**: Crawlee + Playwright (rodando via Node.js)

---

## 2. Estrutura de Pastas

A estrutura segue o padrão Next.js App Router com separação clara de responsabilidades:

```text
iec-gaspar-web/
├── prisma/                    # Schema do banco e migrações
│   └── schema.prisma          # (Tabelas: Competitor, Source, CourseOffer, CrawlRun...)
├── public/                    # Assets estáticos (imagens, favicons)
├── src/
│   ├── app/                   # Next.js App Router (Páginas e APIs)
│   │   ├── actions/           # Server Actions para CRUDs (competitors.ts, sources.ts)
│   │   ├── api/               # Endpoints REST (auth, trigger do crawler, exports)
│   │   ├── dashboard/         # Telas autenticadas do painel administrativo
│   │   └── login/             # Tela de login
│   ├── components/            # Componentes genéricos (shadcn ui) e layout
│   ├── crawler/               # Motor de Scraping Autônomo
│   │   ├── runner.ts          # Orquestrador do Crawlee e integração com Prisma
│   │   ├── crawlee-handlers.ts# Lógica de scraping para cada site concorrente
│   │   ├── normalizer.ts      # Funções utilitárias (ex: conversão de preço e data)
│   │   ├── differ.ts          # Detecta alterações de preço/campanha entre execuções
│   │   └── cli.ts             # Script para rodar o crawler via terminal
│   ├── lib/                   # Configurações utilitárias (prisma client, utils Tailwind)
│   └── generated/             # (Opcional) Prisma Client custom output
└── DOCUMENTATION.md           # Esta documentação
```

---

## 3. Motor de Scraping (Crawlee + Playwright)

Recentemente atualizado, o sistema de coleta utiliza a biblioteca corporativa **Crawlee**, que gerencia filas, navegadores (Playwright) e concorrência nativamente.

### Como funciona o fluxo de captura?
1. **Trigger**: O crawling pode ser disparado pela CLI (`npm run crawler:run`) ou via endpoint de API (`/api/crawl/run`).
2. **Orquestrador (`runner.ts`)**: 
   - Busca no banco (Prisma) quais fontes (`Source`) estão ativas.
   - Para cada fonte, identifica a faculdade (`slug`) e inicia um `PlaywrightCrawler`.
3. **Extração (`crawlee-handlers.ts`)**:
   - Cada faculdade tem um `RequestHandler` específico (ex: `handlePucrs`, `handleDescomplica`).
   - O Crawlee navega até a página (com Headless Chromium).
   - O handler utiliza o **Cheerio** no HTML retornado (ou localizadores nativos) para capturar caixas de cursos, títulos, preços riscados (De X por Y), parcelas e campanhas (cupons).
   - Emite um objeto padronizado do tipo `RawCourseOffer` e o guarda na memória usando a função injetada `pushData()`.
4. **Normalização e Diferenciação (`normalizer.ts` e `differ.ts`)**:
   - Os dados extraídos são padronizados (ex: texto "R$ 1.200,00" vira número `1200.00`).
   - A oferta ganha uma `courseKey` (hash gerada pelo slug do concorrente + título normalizado).
   - O sistema checa a última oferta salva no banco com a mesma `courseKey`. Se o preço/campanha mudou, ele insere um registro na tabela `OfferChangeEvent` e cria uma linha nova em `CourseOffer` marcando-a como `isLatest = true` (Invalidando a anterior).

### Onde alterar para modificar o Scraper?
- **Para adicionar uma NOVA faculdade**: 
  1. Adicione um novo handler exportado no `src/crawler/crawlee-handlers.ts`.
  2. Adicione a chave no dicionário `HANDLERS` dentro de `src/crawler/runner.ts`.
- **Para arrumar o seletor HTML de uma faculdade**: Modifique o arquivo `crawlee-handlers.ts` na função correspondente.

---

## 4. Banco de Dados e Migrations

O sistema utiliza o PostgreSQL modelado pelo **Prisma**. O schema principal se encontra em `prisma/schema.prisma`.

### Controle de Migrations
O Prisma controla o versionamento do banco. **Sempre que você alterar o `schema.prisma`**, execute:

```bash
# Para aplicar no seu banco de dados local de desenvolvimento
npx prisma migrate dev --name descreva_sua_mudanca

# Isso irá gerar o novo Prisma Client que TypeScript utiliza
```

Para aplicar migrações em **Produção**:
```bash
npx prisma migrate deploy
```

### Tabelas Principais (System Design)
- **`Competitor`**: Cadastro da marca/faculdade.
- **`Source`**: As URLs que pertencem ao Competitor e que o Crawler deve visitar. (Relacionamento 1:N).
- **`CrawlRun`**: Registra cada execução que o motor de busca tentou fazer, seu status (`SUCCESS` ou `ERROR`) e tempo de duração.
- **`CourseOffer`**: Ofertário do curso. Armazena as informações capturadas (nome, preço cheio, preço com desconto, parcelas). O versionamento histórico é feito marcando a versão ativa como `isLatest: true`.
- **`OfferChangeEvent`**: Sempre que o script nota que o preço caiu, subiu ou uma campanha nova surgiu (olhando o histórico), ele loga nesta tabela.

---

## 5. Autenticação e Autorização (RBAC)

O controle de sessão é feito via **NextAuth.js**.
- **Configuração**: `src/app/api/auth/[...nextauth]/route.ts`.
- Todas as rotas dentro de `/dashboard` estão protegidas por layout ou middleware, dependendo da configuração.
- **Permissões (RBAC)**: O enum de banco de dados `Role` (ADMIN, ANALYST, VIEWER) é utilizado. Operações de CRUD de Concorrentes (`src/app/actions`) idealmente checam a sessão do usuário. O modelo base já prevê que usuários VIEWER não consigam salvar/editar registros sensíveis.

---

## 6. Fluxo de Frontend (Dashboard)

As páginas dentro de `src/app/dashboard` utilizam Server Components por padrão. 

### Server Actions
Aplicações mais complexas utilizam funções exportadas em `src/app/actions/*.ts` para se comunicar com o servidor e realizar operações CRUD. Isso remove a necessidade de ter dezenas de endpoits na `/api`.
- Exemplo: Criar, Editar ou Deletar concorrentes ou fontes nas páginas `/dashboard/competitors` e `/dashboard/competitors/[id]` disparam ações de `actions/competitors.ts`.

### Componentização
A UI segue firmemente o Design System do setor de TI do IEC.
- Formulários utilizam `react-hook-form` validados no servidor (e cliente) com a biblioteca `zod`.
- Componentes modulares (`Dialog`, `Button`, `Select`, `Table`) residem em `src/components/ui/` e são provenientes do shadcn/ui.
- O tema é estrito (Modo Escuro Forçado, tipografia Inter e JetBrains Mono, com Tailwind v4).

---

## 7. Como e Onde Alterar o Sistema (Cheatsheet)

| O que você quer fazer? | Arquivo/Pasta onde fazer a alteração |
|---|---|
| **Adicionar uma nova coluna na tabela do banco** | `prisma/schema.prisma` -> Rodar `npx prisma migrate dev` |
| **Arrumar a captura de preços de uma faculdade** | `src/crawler/crawlee-handlers.ts` |
| **Adicionar lógica para formatar preços de forma diferente**| `src/crawler/normalizer.ts` |
| **Criar uma nova página no painel (ex: Relatórios)** | Criar pasta e arquivo `src/app/dashboard/reports/page.tsx` |
| **Mudar a lógica do botão "Salvar Concorrente"** | Lógica no cliente: `competitor-form.tsx`. Mutação no servidor: `actions/competitors.ts` |
| **Criar um endpoint público para consumir via JSON** | Criar pasta em `src/app/api/minha-rota/route.ts` contendo `export async function GET()` |
| **Mudar paleta de cores ou Tailwind base** | `src/app/globals.css` (Para CSS/variáveis) ou `tailwind.config.ts` se usasse v3 (v4 usa css) |

---

## Dicas para Manutenção

1. **Testando o Crawler Localmente**: Não bata em rotas de API para debugar HTML/Playwright. Utilize a CLI:
   `npx ts-node src/crawler/cli.ts` (ou ferramenta similar caso tenha definido no package.json).
2. **Typescript Strictness**: A integração `react-hook-form` + `zod` + `Prisma` garante inferência total. Se você mudar o banco (`schema.prisma`) e rodar a migration, o Typescript imediatamente vai alertar se formulários e `page.tsx` estiverem passando propriedades desatualizadas.
3. **Gerenciamento do NextAuth**: Certifique-se de configurar e rotacionar os `NEXTAUTH_SECRET` nas variáveis de ambiente em produção.
