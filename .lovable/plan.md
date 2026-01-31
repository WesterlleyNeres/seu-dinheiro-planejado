
Objetivo
- Corrigir o erro “Tenant ou usuário não encontrado” ao tentar criar tarefa/evento/hábito no JARVIS após a limpeza de dados.
- Garantir que, se um usuário autenticado não tiver workspace (tenant) ainda, o sistema consiga criar automaticamente um tenant “Pessoal - {Nome}” e a membership “owner”, sem falhar por regras de segurança do backend.

O que descobri (causa raiz)
- O erro exibido nos cards do JARVIS (“Tenant ou usuário não encontrado”) não é o problema principal; ele é apenas um “efeito colateral” porque tenantId fica null.
- O problema real está no bootstrap do tenant dentro do TenantContext:
  - O app busca memberships em tenant_members.
  - Como o retorno vem vazio (Response Body: []), ele tenta criar um tenant novo.
  - Essa criação falha com: “new row violates row-level security policy for table "tenants"”.
- Existe policy de INSERT em tenants (tenants_insert_own) e ela parece correta (WITH CHECK auth.uid() = created_by).
- Porém, o insert está sendo feito com .select().single(), e isso exige que a linha inserida também passe pela policy de SELECT para ser retornada.
  - A policy atual de SELECT em tenants (tenants_select_if_member) só deixa ver tenants onde o usuário já é membro em tenant_members.
  - No momento do INSERT, ainda não existe membership, então o SELECT nega a linha recém-criada e o PostgREST acaba retornando 403 com mensagem de RLS, impedindo o bootstrap do tenant.

Correção proposta (backend / RLS)
1) Ajustar policy de SELECT da tabela public.tenants
- Trocar a regra “apenas se for membro” por “se for dono (created_by) OU se for membro”.
- Isso permite:
  - O INSERT + RETURNING (via .select()) funcionar imediatamente para o criador.
  - Continuar protegendo o acesso para outras pessoas.

SQL planejado (migração)
- Remover a policy atual e recriar:

  DROP POLICY IF EXISTS "tenants_select_if_member" ON public.tenants;

  CREATE POLICY "tenants_select_if_owner_or_member"
  ON public.tenants
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id = auth.uid()
    )
  );

Observações importantes
- Isso não cria recursão infinita:
  - A policy de tenants consulta tenant_members.
  - A policy de SELECT em tenant_members é simples (user_id = auth.uid()) e não consulta tenants, então não há loop.
- A tabela tenant_members já possui uma policy de INSERT de bootstrap (tenant_members_insert_bootstrap) que permite inserir o primeiro “owner” se ainda não existe membership para aquele tenant; isso deve destravar o fluxo completo (cria tenant → cria membership → tenantId passa a existir).

Melhoria complementar (frontend)
2) Tornar o TenantContext mais resiliente e “autocurável”
- Após corrigir a policy, o fluxo atual deve voltar a funcionar sem mudar o código.
- Mesmo assim, vou reforçar para evitar regressões:
  - Se o insert do tenant falhar, exibir um erro mais explícito na UI (ex.: “Não foi possível criar seu workspace. Verifique permissões.”) em vez de deixar o usuário chegar no erro de “Tenant ou usuário não encontrado”.
  - Desabilitar ações de criação (QuickAdd, botões “Criar tarefa/hábito”, etc.) enquanto tenantLoading estiver true ou enquanto tenantId estiver null e existir erro no TenantContext.
  - Opcional: adicionar um botão “Tentar novamente” chamando refetch().

Verificações e testes (end-to-end)
3) Cenários para validar na prática
- Cenário A: usuário antigo (auth existente) sem rows em tenants/tenant_members (após limpeza)
  - Ao abrir o app: deve criar automaticamente “Pessoal - {Nome}”
  - Deve permitir criar tarefa, evento e hábito.
- Cenário B: usuário novo
  - Deve criar tenant/membership automaticamente e funcionar igual.
- Cenário C: usuário com múltiplos tenants
  - TenantSwitcher continua funcionando
  - Troca de tenant invalida queries e muda dados do JARVIS corretamente.

Checagens técnicas (diagnóstico pós-fix)
4) Confirmar via logs e rede
- Confirmar que o POST /tenants deixa de retornar 403.
- Confirmar que, após criar tenant, ocorre o POST /tenant_members com sucesso.
- Confirmar que tenant_members GET passa a retornar pelo menos 1 item.

Riscos/impactos
- Baixo risco: a mudança apenas amplia o SELECT para o owner, mantendo isolamento por membership para os demais.
- Não altera schema nem dados existentes; apenas política de acesso.

Entregáveis desta implementação
- 1 migração SQL com ajuste da policy de SELECT em tenants.
- Ajustes pequenos no frontend para feedback/UX quando tenant não puder ser criado (opcional, mas recomendado para evitar “erro silencioso” e frustração).
