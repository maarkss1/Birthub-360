# Tenancy Policy — [DEPRECATED / ARCHIVAL - DEVOPS-005]
# Este arquivo é mantido apenas como registro histórico de política declarativa OPA.
# O isolamento real de tenant é garantido no banco de dados via PostgreSQL Row Level Security (RLS)
# e no backend via `authenticateToken` e `getTenantPrisma` (ver /AGENTS.md e prisma/schema.prisma).
# Nenhuma rota HTTP ativa depende desta policy.

package atlasgr.tenancy

import rego.v1

# ─────────────────────────────────────────────────────────────────────────────
# Regra principal: tenant_allowed = true apenas quando o acesso é ao próprio tenant
#
# Input esperado:
#   {
#     "user": {
#       "id": "usr_abc",
#       "organizationId": "org_atlas_123",
#       "brand": "atlasgr"        ← "atlasgr" | "totaltrac"
#     },
#     "resource": {
#       "organizationId": "org_atlas_123",
#       "brand": "atlasgr"
#     }
#   }
# ─────────────────────────────────────────────────────────────────────────────
default tenant_allowed := false

tenant_allowed if {
    # Organização do usuário == organização do recurso (isolamento por org)
    input.user.organizationId == input.resource.organizationId
}

tenant_allowed if {
    # Super-admin da plataforma (sem brand lock) — apenas para suporte interno
    input.user.role == "platform_admin"
}

# ─────────────────────────────────────────────────────────────────────────────
# Isolamento adicional por brand: AtlasGR não vê dados TotalTrac e vice-versa
# (separação visual MAIS isolamento de dados)
# ─────────────────────────────────────────────────────────────────────────────
default brand_allowed := false

brand_allowed if {
    # Marcas compatíveis
    input.user.brand == input.resource.brand
}

brand_allowed if {
    # Platform admin pode ver ambas as marcas para suporte
    input.user.role == "platform_admin"
}

# ─────────────────────────────────────────────────────────────────────────────
# Regra composta: acesso permitido = tenant OK E brand OK
# ─────────────────────────────────────────────────────────────────────────────
default allow := false

allow if {
    tenant_allowed
    brand_allowed
}

# ─────────────────────────────────────────────────────────────────────────────
# Violação: acesso cruzado de tenant detectado
# Útil para logging e alertas de segurança
# ─────────────────────────────────────────────────────────────────────────────
cross_tenant_violation if {
    input.user.organizationId != input.resource.organizationId
    not input.user.role == "platform_admin"
}

cross_brand_violation if {
    input.user.brand != input.resource.brand
    not input.user.role == "platform_admin"
}
